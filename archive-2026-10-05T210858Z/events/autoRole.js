// events/autoRole.js
// أي عضو يدخل ياخد MEMBER_ROLE_ID، وأي بوت ياخد BOT_ROLE_ID
const { Events } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    try {
      const roleId = member.user.bot ? config.botRoleId : config.memberRoleId;
      if (!roleId) return;

      const role = member.guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`[AUTOROLE] Role ${roleId} not found in guild.`);
        return;
      }
      if (member.roles.cache.has(roleId)) return;

      await member.roles.add(role, member.user.bot ? 'Auto role: bot' : 'Auto role: new member');
    } catch (err) {
      if (err.code === 50013) {
        console.warn(
          '[AUTOROLE] مفيش صلاحية: تأكد إن البوت معاه Manage Roles ورتبته أعلى من الرول ده.'
        );
      } else {
        console.error('[AUTOROLE] Failed to assign role:', err);
      }
    }
  },
};
