const {of, throwError} = require('rxjs');
const {flatMap, catchError} = require('rxjs/operators');
const {Command} = require("chaos-core");
const {ChaosError} = require("chaos-core").errors;
const {DiscordAPIError} = require('discord.js');

const {handleDiscordApiError, handleChaosError} = require("../lib/error-handlers");

class LeaveCommand extends Command {
  constructor(chaos) {
    super(chaos, {
      name: "leave",
      description: "leave a role",

      args: [{
        name: "role",
        description: "the name of the role to leave",
        greedy: true,
        required: true,
      }],
    });
  }

  get strings() {
    return super.strings.userRoles.commands.leave;
  }

  run(context, response) {
    const UserRolesService = this.chaos.getService('UserRoles', 'UserRolesService');
    const roleService = this.chaos.getService('core', 'RoleService');
    const roleString = context.args.role;

    return of('').pipe(
      flatMap(() => roleService.findRole(context.guild, roleString)),
      flatMap(role => UserRolesService.removeUserFromRole(context.member, role).pipe(
        flatMap(() => response.send({
          content: this.strings.removedFromRole({roleName: role.name}),
        })),
      )),
      catchError((error) => {
        switch (true) {
          case error instanceof DiscordAPIError:
            return handleDiscordApiError(error, response);
          case error instanceof ChaosError:
            return handleChaosError(error, response);
          default:
            return throwError(error);
        }
      }),
    );
  }
}

module.exports = LeaveCommand;
