const {of, throwError} = require('rxjs/index');
const {flatMap, catchError} = require('rxjs/operators/index');
const {Command} = require("chaos-core");
const {RoleNotFoundError} = require("chaos-core").errors;
const {DiscordAPIError} = require('discord.js');

const {JoinableRoleError} = require("../errors");

class JoinCommand extends Command {
  constructor(chaos) {
    super(chaos, {
      name: "join",
      description: "join a role",

      args: [{
        name: "role",
        description: "the name of the role to join",
        required: true,
      }],
    });
  }

  onListen() {
    this.joinRolesService = this.chaos.getService('joinableRoles', 'JoinRolesService');
    this.roleService = this.chaos.getService('core', 'RoleService');
  }

  run(context, response) {
    const roleString = context.args.role;

    return of('').pipe(
      flatMap(() => this.roleService.findRole(context.guild, roleString)),
      flatMap(role => this.joinRolesService.addUserToRole(context.member, role).pipe(
        flatMap(() => response.send({
          content: `You have been added to the role ${role.name}.`,
        })),
      )),
      catchError(error => {
        switch(true) {
          case error instanceof DiscordAPIError:
            return JoinCommand.handleDiscordApiError(context, response, error);
          case error instanceof JoinableRoleError:
          case error instanceof RoleNotFoundError:
            return response.send({
              content: error.message,
            });
          default:
            return throwError(error);
        }
      }),
    );
  }

  static handleDiscordApiError(context, response, error) {
    switch (error.message) {
      case "Missing Permissions":
        return response.send({
          type: 'message',
          content:
            `Whoops, I do not have permission to update user roles. Can you ask an admin to grant me the ` +
            `"Manage Roles" permission?`,
        });
      case "Privilege is too low...":
        return response.send({
          type: 'message',
          content: `I'm unable to change your roles; Your permissions outrank mine.`,
        });
      default:
        return throwError(error);
    }
  }
}

module.exports = JoinCommand;