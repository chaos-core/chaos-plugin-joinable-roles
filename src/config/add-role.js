const ChaosCore = require("chaos-core");
const {of, throwError} = require("rxjs");
const {flatMap, map, mapTo, catchError} = require("rxjs/operators");

class AddRoleAction extends ChaosCore.ConfigAction {
  constructor(chaos) {
    super(chaos, {
      name: "addRole",
      args: [
        {
          name: "role",
          description: "The name of the role to add. Can be by mention, name, or id",
          required: true,
        },
      ],
    });

    this.RoleService = this.chaos.getService('core', 'RoleService');
    this.UserRolesService = this.chaos.getService('UserRoles', 'UserRolesService');
  }

  run(context) {
    return of('').pipe(
      flatMap(() => this.RoleService.findRole(context.guild, context.args.role)),
      flatMap((role) => this.UserRolesService.allowRole(role).pipe(mapTo(role))),
      map((role) => ({
        status: 200,
        content: `Users can now join ${role.name}`,
      })),
      catchError((error) => {
        if (error instanceof ChaosCore.errors.RoleNotFoundError) {
          return of({status: 400, content: error.message});
        } else {
          return throwError(error);
        }
      }),
    );
  }
}

module.exports = AddRoleAction;