const {toArray, tap} = require('rxjs/operators');
const {CommandContext, Response} = require('chaos-core');
const {Collection, SnowflakeUtil} = require('discord.js');

const createChaosBot = require('../support/create-chaos-bot');
const JoinCommand = require('../../lib/commands/join');

describe('JoinCommand', function () {
  beforeEach(function () {
    this.chaos = createChaosBot();
    this.command = new JoinCommand(this.chaos);
    this.command.onListen();

    this.guild = {
      id: SnowflakeUtil.generate(),
      roles: new Collection(),
    };

    this.member = {
      id: SnowflakeUtil.generate(),
      guild: this.guild,
      roles: new Collection(),
      addRole: function (role) {
        this.roles.set(role.id, role);
        return Promise.resolve(this);
      },
      removeRole: function (role) {
        this.roles.delete(role.id);
        return Promise.resolve(this);
      },
    };

    this.channel = {
      id: SnowflakeUtil.generate(),
      guild: this.guild,
      send: message => Promise.resolve({
        id: SnowflakeUtil.generate(),
        content: message,
      }),
    };

    this.message = {
      id: SnowflakeUtil.generate(),
      guild: this.guild,
      member: this.member,
      channel: this.channel,
    };

    this.context = new CommandContext(
      this.message,
      this.command,
    );

    this.response = new Response(
      this.message,
    );
  });

  describe('!join {role}', function () {
    beforeEach(function () {
      this.role = {
        id: SnowflakeUtil.generate(),
        name: "test",
        guild: this.guild,
      };
      this.guild.roles.set(this.role.id, this.role);

      this.context.args.role = this.role.name;
    });

    context('when the role is joinable', function () {
      beforeEach(function (done) {
        const joinableRolesService = this.chaos.getService('joinableRoles', 'JoinRolesService');

        joinableRolesService.allowRole(this.role)
          .subscribe(() => done(), (error) => done(error));
      });

      it('adds the role to the user', function (done) {
        sinon.spy(this.context.member, 'addRole');

        this.command.run(this.context, this.response).pipe(
          toArray(),
          tap(() => {
            expect(this.context.member.addRole).to.have.been.calledWith(this.role);
          }),
        ).subscribe(() => done(), error => done(error));
      });

      it('sends a success message', function (done) {
        sinon.spy(this.response, 'send');

        this.command.run(this.context, this.response).pipe(
          toArray(),
          tap(() => {
            expect(this.response.send).to.have.been.calledWith({
              content: "You have been added to the role test.",
            });
          }),
        ).subscribe(() => done(), error => done(error));
      });

      context('when the user has already joined the role', function () {
        beforeEach(function () {
          this.member.roles.set(this.role.id, this.role);
        });

        it('sends a error message', function (done) {
          sinon.spy(this.response, 'send');

          this.command.run(this.context, this.response).pipe(
            toArray(),
            tap(() => {
              expect(this.response.send).to.have.been.calledWith({
                content: "You have already joined test.",
              });
            }),
          ).subscribe(() => done(), error => done(error));
        });
      });
    });

    context('when the role is not joinable', function () {
      it('does not add the role to the user', function (done) {
        sinon.spy(this.context.member, 'addRole');

        this.command.run(this.context, this.response).pipe(
          toArray(),
          tap(() => {
            expect(this.context.member.addRole).not.to.have.been.called;
          }),
        ).subscribe(() => done(), error => done(error));
      });

      it('sends a error message', function (done) {
        sinon.spy(this.response, 'send');

        this.command.run(this.context, this.response).pipe(
          toArray(),
          tap(() => {
            expect(this.response.send).to.have.been.calledWith({
              content: "test can not be joined.",
            });
          }),
        ).subscribe(() => done(), error => done(error));
      });
    });
  });
});
