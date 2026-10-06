// events/securityGuard.js
// أي رسالة في روم الحماية = حساب مخترق: كتم 60 دقيقة + حذف آخر رسالة له في كل الرومات
const { Events } = require('discord.js');
const { COLORS, logToGuild } = require('../utils/logger');
const {
  MUTE_MINUTES,
  getSecurityChannelId,
  deleteLastMessageEverywhere,
} = require('../utils/security');

const handling = new Set(); // عشان نفس العضو ميتعالجش مرتين لو بعت كذا رسالة ورا بعض

async function handleIntruder(message) {
  const { guild, author } = message;

  let member = message.member;
  if (!member) member = await guild.members.fetch(author.id).catch(() => null);

  // 1) كتم فوري
  let muted = false;
  let muteNote = '';
  if (!member) {
    muteNote = 'العضو مش موجود في السيرفر';
  } else if (!member.moderatable) {
    muteNote = 'البوت مش قادر يكتمه (رتبته أعلى من البوت أو معاه Administrator)';
  } else {
    try {
      await member.timeout(MUTE_MINUTES * 60 * 1000, 'Security: message in protection channel');
      muted = true;
    } catch (err) {
      muteNote = err.message;
    }
  }

  // 2) حذف رسالة الروم + آخر رسالة في كل رومات السيرفر
  await message.delete().catch(() => {});
  const deleted = await deleteLastMessageEverywhere(guild, author.id);

  // 3) لوج الإدارة
  await logToGuild(
    guild,
    {
      title: '🚨 اشتباه في حساب مخترق',
      color: COLORS.danger,
      thumbnail: author.displayAvatarURL(),
      fields: [
        { name: '👤 العضو', value: `${author} (\`${author.id}\`)`, inline: true },
        { name: '📍 الروم', value: `${message.channel}`, inline: true },
        {
          name: '🔇 الكتم',
          value: muted ? `✅ ${MUTE_MINUTES} دقيقة` : `❌ ${muteNote}`,
        },
        { name: '🗑️ رسائل اتحذفت من الرومات', value: String(deleted), inline: true },
      ],
    },
    'moderation'
  );
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (!message.guild || message.author.bot) return;

      const securityChannelId = getSecurityChannelId(message.guild.id);
      if (!securityChannelId || message.channelId !== securityChannelId) return;

      if (handling.has(message.author.id)) {
        await message.delete().catch(() => {});
        return;
      }

      handling.add(message.author.id);
      try {
        await handleIntruder(message);
      } finally {
        handling.delete(message.author.id);
      }
    } catch (err) {
      console.error('[SECURITY] Failed to handle message:', err);
    }
  },
};
