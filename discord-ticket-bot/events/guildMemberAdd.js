// events/guildMemberAdd.js
const { Events } = require('discord.js');
const config = require('../utils/config');
const { welcomeEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    try {
      if (!config.welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(
        config.welcomeChannelId
      );

      if (!channel) {
        console.warn(
          '[WELCOME] Configured welcome channel was not found.'
        );
        return;
      }

      await channel.send({
        content: `🎉 أهلاً وسهلاً <@${member.id}>!`,
        embeds: [
          welcomeEmbed(member),
        ],
      });

    } catch (err) {
      console.error(
        '[WELCOME] Failed to send welcome message:',
        err
      );
    }
  },
};