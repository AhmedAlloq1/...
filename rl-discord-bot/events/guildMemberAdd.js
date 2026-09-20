const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');

module.exports = {
  name: 'guildMemberAdd',

  async execute(member) {
    try {
      const guild = member.guild;
      const channel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === config.welcomeChannel
      );

      if (!channel) {
        console.warn(`[WELCOME] Channel "${config.welcomeChannel}" not found.`);
        return;
      }

      const me = guild.members.me;
      const perms = channel.permissionsFor(me);
      if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.EmbedLinks)) {
        console.warn(`[WELCOME] Missing Send Messages / Embed Links in #${channel.name}, skipping.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎮 Welcome to the Team!')
        .setDescription(
          `أهلاً بك في فريقنا يا ${member} 🔥\n\n` +
            `استمتع مع الفريق، شارك الـ Clips الخاصة بك، والعب مع باقي الأعضاء!\n\n` +
            `🚗⚽ **${guild.name}**`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Rocket League Team' })
        .setTimestamp();

      await channel.send({ content: `${member}`, embeds: [embed] });
      console.log(`[WELCOME] Sent welcome message for ${member.user.tag}`);
    } catch (err) {
      console.error('[WELCOME ERROR]', err);
    }
  },
};
