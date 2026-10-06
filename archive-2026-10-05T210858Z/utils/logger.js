// utils/logger.js
// إرسال إمبدات اللوجات لروم اللوج المناسب — نسخة Node.js من logger.py

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('./settingsManager');

const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  neutral: 0x2b2d31,
};

// اسم الروم المتوقع لكل نوع لوج (بيستخدم في setup-logs-auto و setup-logs-create)
const AUTO_CHANNEL_NAMES = {
  general: 'room-logs',
  messages: 'message-logs',
  members: 'join-leave-logs',
  moderation: 'modration-logs',
  server: 'room-logs',
  roles: 'roles-logs',
  voice: 'voice-logs',
  tickets: 'ticket-logs',
};

const LOG_TYPE_LABELS = {
  general: 'عام',
  messages: 'الرسائل',
  members: 'الأعضاء',
  moderation: 'الإدارة',
  server: 'السيرفر',
  roles: 'الرولات',
  voice: 'الفويس',
  tickets: 'التذاكر',
};

// يرجّع روم اللوج للنوع ده (أو العام لو النوع مش متظبط)
function getLogChannel(guild, logType = 'general') {
  const logs = getGuildSettings(guild.id).logs || {};
  const channelId = logs[logType] || logs.general;
  if (!channelId) return null;
  const channel = guild.channels.cache.get(channelId);
  return channel && channel.isTextBased() ? channel : null;
}

/**
 * embedData: { title, description?, color?, thumbnail?, fields?: [{ name, value, inline? }] }
 */
async function logToGuild(guild, embedData, logType = 'general') {
  if (!guild) return;
  const channel = getLogChannel(guild, logType);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(embedData.color ?? COLORS.neutral)
    .setTimestamp();
  if (embedData.title) embed.setTitle(embedData.title);
  if (embedData.description) embed.setDescription(embedData.description);
  if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
  if (embedData.fields?.length) {
    embed.addFields(
      embedData.fields.map((f) => ({
        name: f.name || '\u200b',
        value: f.value || '\u200b',
        inline: Boolean(f.inline),
      }))
    );
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    if (err.code === 50013 || err.code === 50001) {
      console.warn(`⚠️ [لوج] مفيش صلاحية إرسال في روم اللوج (${channel.id}) في سيرفر ${guild.name}`);
    } else {
      console.error('❌ [لوج] فشل إرسال اللوج:', err);
    }
  }
}

module.exports = { COLORS, AUTO_CHANNEL_NAMES, LOG_TYPE_LABELS, getLogChannel, logToGuild };
