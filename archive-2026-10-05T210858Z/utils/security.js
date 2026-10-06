// utils/security.js
// أدوات نظام الحماية من الحسابات المخترقة
const { PermissionFlagsBits } = require('discord.js');
const config = require('./config');
const { getGuildSettings } = require('./settingsManager');

const MUTE_MINUTES = 60;

// روم الحماية: من /setup-security أولاً، وبعدين SECURITY_CHANNEL_ID من .env
function getSecurityChannelId(guildId) {
  return getGuildSettings(guildId).security?.channelId || config.securityChannelId || null;
}

// يحذف آخر رسالة للعضو في كل روم نصي يقدر البوت يديره. بيرجّع عدد الرسائل اللي اتحذفت.
async function deleteLastMessageEverywhere(guild, userId) {
  const me = guild.members.me;
  if (!me) return 0;

  const channels = [...guild.channels.cache.values()].filter(
    (c) =>
      c.isTextBased() &&
      !c.isThread() &&
      c.permissionsFor(me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ])
  );

  let deleted = 0;
  const BATCH = 5; // دفعات صغيرة عشان نتجنب الـ rate limit
  for (let i = 0; i < channels.length; i += BATCH) {
    await Promise.all(
      channels.slice(i, i + BATCH).map(async (channel) => {
        try {
          const messages = await channel.messages.fetch({ limit: 100 });
          const last = messages
            .filter((m) => m.author.id === userId)
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
            .first();
          if (last) {
            await last.delete();
            deleted++;
          }
        } catch {
          // روم مش متاح أو الرسالة اتحذفت قبل كده: نكمل
        }
      })
    );
  }
  return deleted;
}

module.exports = { MUTE_MINUTES, getSecurityChannelId, deleteLastMessageEverywhere };
