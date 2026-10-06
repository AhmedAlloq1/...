// events/guildMemberAdd.js
const fs = require('fs');
const path = require('path');
const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../utils/config');
const { welcomeEmbed } = require('../utils/embeds');

const BANNER_PATH = path.join(__dirname, '..', 'assets', 'welcome-banner.png');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    try {
      if (!config.welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (!channel) {
        console.warn('[WELCOME] Configured welcome channel was not found.');
        return;
      }

      const hasBanner = fs.existsSync(BANNER_PATH);
      const payload = {
        content: `<@${member.id}>`,
        embeds: [welcomeEmbed(member, { withBanner: hasBanner })],
        files: hasBanner
          ? [new AttachmentBuilder(BANNER_PATH, { name: 'welcome-banner.png' })]
          : [],
      };

      // زر "قوانين السيرفر" (بيظهر بس لو RULES_CHANNEL_ID متحدد)
      if (config.rulesChannelId) {
        payload.components = [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel('قوانين السيرفر')
              .setEmoji('📋')
              .setURL(`https://discord.com/channels/${member.guild.id}/${config.rulesChannelId}`)
          ),
        ];
      }

      await channel.send(payload);
    } catch (err) {
      console.error('[WELCOME] Failed to send welcome message:', err);
    }
  },
};
