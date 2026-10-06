// events/logsEvents.js
// لوجات الرسائل والسيرفر والرولات والفويس — نسخة Node.js من logs_events.py
// الملف ده بيصدّر Array من الأحداث (index.js بيدعم كده).

const { Events, EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const { COLORS, getLogChannel, logToGuild } = require('../utils/logger');

const CHANNEL_TYPE_LABELS = {
  [ChannelType.GuildText]: '💬 نصية',
  [ChannelType.GuildVoice]: '🔊 صوتية',
  [ChannelType.GuildCategory]: '📁 كاتيجوري',
  [ChannelType.GuildAnnouncement]: '📢 إعلانات',
  [ChannelType.GuildStageVoice]: '🎤 ستيدج',
  [ChannelType.GuildForum]: '🗂️ فورم',
};
const typeLabel = (type) => CHANNEL_TYPE_LABELS[type] || 'غير معروف';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// يدور في الأوديت لوج على مين عمل نقل/طرد صوتي خلال آخر 30 ثانية.
// (سجل الطرد الصوتي في ديسكورد مابيحملش آيدي الروم أو الشخص، فبناخد أحدث سجل من النوع ده)
async function findVoiceActor(guild, action) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(1500);
    try {
      const logs = await guild.fetchAuditLogs({ type: action, limit: 5 });
      const entry = logs.entries.first();
      if (entry && Date.now() - entry.createdTimestamp < 30_000) return entry.executor;
    } catch (err) {
      if (err.code === 50013) {
        console.warn(`⚠️ [لوج فويس] مفيش صلاحية 'View Audit Log' للبوت في ${guild.name}.`);
        return null;
      }
      console.warn('⚠️ [لوج فويس] خطأ وهو بيدور في الأوديت لوج:', err.message);
    }
  }
  return null;
}

async function safeSend(channel, embed) {
  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    // نفس السلوك القديم: أي فشل في الإرسال يتجاهل
  }
}

module.exports = [
  // ---------- تحميل كل الأعضاء عند التشغيل (عشان لوج الرولات يشتغل لكل الأعضاء) ----------
  {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.members.fetch();
        } catch (err) {
          console.warn(`[LOGS] Could not fetch members for ${guild.name}:`, err.message);
        }
      }
    },
  },

  // ---------- لوج الرسائل ----------
  {
    name: Events.MessageDelete,
    async execute(message) {
      if (!message.guild || message.author?.bot) return;
      const logChannel = getLogChannel(message.guild, 'messages');
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('🗑️ تم حذف رسالة')
        .setColor(COLORS.danger)
        .setTimestamp()
        .addFields(
          { name: 'الكاتب', value: message.author?.tag || 'غير معروف (رسالة قديمة)', inline: true },
          { name: 'الروم', value: `${message.channel}`, inline: true },
          { name: 'المحتوى', value: message.content ? message.content.slice(0, 1000) : '*لا يوجد محتوى نصي متاح*' }
        );
      await safeSend(logChannel, embed);
    },
  },
  {
    name: Events.MessageUpdate,
    async execute(before, after) {
      if (!before.guild || before.partial || before.author?.bot) return;
      if (after.partial) {
        try {
          after = await after.fetch();
        } catch {
          return;
        }
      }
      if (before.content === after.content) return;
      const logChannel = getLogChannel(before.guild, 'messages');
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('✏️ تم تعديل رسالة')
        .setColor(COLORS.warning)
        .setTimestamp()
        .addFields(
          { name: 'الكاتب', value: before.author.tag, inline: true },
          { name: 'الروم', value: `${before.channel}`, inline: true },
          { name: 'قبل', value: before.content ? before.content.slice(0, 500) : '*فارغ*' },
          { name: 'بعد', value: after.content ? after.content.slice(0, 500) : '*فارغ*' }
        );
      await safeSend(logChannel, embed);
    },
  },

  // ---------- لوج الإدارة ----------
  {
    name: Events.GuildBanAdd,
    async execute(ban) {
      await logToGuild(
        ban.guild,
        {
          title: '🔨 تم حظر عضو',
          color: COLORS.danger,
          thumbnail: ban.user.displayAvatarURL(),
          fields: [{ name: '👤 العضو', value: `${ban.user.tag} (\`${ban.user.id}\`)` }],
        },
        'moderation'
      );
    },
  },
  {
    name: Events.GuildBanRemove,
    async execute(ban) {
      await logToGuild(
        ban.guild,
        {
          title: '♻️ تم فك حظر عضو',
          color: COLORS.success,
          thumbnail: ban.user.displayAvatarURL(),
          fields: [{ name: '👤 العضو', value: `${ban.user.tag} (\`${ban.user.id}\`)` }],
        },
        'moderation'
      );
    },
  },

  // ---------- لوج السيرفر (رومات) ----------
  {
    name: Events.ChannelCreate,
    async execute(channel) {
      await logToGuild(
        channel.guild,
        {
          title: '📌 تم إنشاء قناة جديدة',
          color: COLORS.success,
          fields: [
            { name: '📢 القناة', value: `${channel} (\`${channel.name}\`)`, inline: true },
            { name: '📁 النوع', value: typeLabel(channel.type), inline: true },
          ],
        },
        'server'
      );
    },
  },
  {
    name: Events.ChannelDelete,
    async execute(channel) {
      await logToGuild(
        channel.guild,
        {
          title: '🗑️ تم حذف قناة',
          color: COLORS.danger,
          fields: [
            { name: '📢 الاسم', value: `\`${channel.name}\``, inline: true },
            { name: '📁 النوع', value: typeLabel(channel.type), inline: true },
          ],
        },
        'server'
      );
    },
  },

  // ---------- لوج الرولات ----------
  {
    name: Events.GuildRoleCreate,
    async execute(role) {
      await logToGuild(
        role.guild,
        {
          title: '🎭 تم إنشاء رول جديد',
          color: COLORS.success,
          fields: [{ name: '🎭 الرول', value: `${role} (\`${role.name}\`)` }],
        },
        'roles'
      );
    },
  },
  {
    name: Events.GuildRoleDelete,
    async execute(role) {
      await logToGuild(
        role.guild,
        {
          title: '🗑️ تم حذف الرول',
          color: COLORS.danger,
          fields: [{ name: '🎭 الاسم', value: `\`${role.name}\`` }],
        },
        'roles'
      );
    },
  },
  {
    name: Events.GuildMemberUpdate,
    async execute(before, after) {
      if (before.partial) return; // من غير الحالة القديمة مش هنعرف إيه اللي اتغير
      const added = after.roles.cache.filter((r) => !before.roles.cache.has(r.id));
      const removed = before.roles.cache.filter((r) => !after.roles.cache.has(r.id));

      const base = (role) => ({
        thumbnail: after.displayAvatarURL(),
        fields: [
          { name: '👤 العضو', value: `${after} (\`${after.id}\`)`, inline: true },
          { name: '🎭 الرول', value: `${role}`, inline: true },
        ],
      });

      for (const role of added.values()) {
        await logToGuild(after.guild, { title: '➕🎭 اتضاف رول لعضو', color: COLORS.success, ...base(role) }, 'roles');
      }
      for (const role of removed.values()) {
        await logToGuild(after.guild, { title: '➖🎭 اتشال رول من عضو', color: COLORS.danger, ...base(role) }, 'roles');
      }
    },
  },

  // ---------- لوج الفويس (دخول/خروج/نقل/طرد) ----------
  {
    name: Events.VoiceStateUpdate,
    async execute(before, after) {
      if (before.channelId === after.channelId) return;
      const member = after.member || before.member;
      if (!member) return;
      // نتجاهل حركة البوت نفسه (مش لوج مفيد)
      if (member.id === member.client.user.id) return;

      const guild = member.guild;
      const isBot = member.user.bot;
      const who = isBot ? 'بوت' : 'عضو';
      const whoLabel = isBot ? '🤖 البوت' : '👤 العضو';
      const thumbnail = member.displayAvatarURL();

      // دخول
      if (!before.channel && after.channel) {
        return logToGuild(
          guild,
          {
            title: `🔊 ${who} دخل روم صوتي`,
            color: COLORS.success,
            thumbnail,
            fields: [
              { name: whoLabel, value: `${member}`, inline: true },
              { name: '📍 الروم', value: `${after.channel}`, inline: true },
            ],
          },
          'voice'
        );
      }

      // خروج أو طرد
      if (before.channel && !after.channel) {
        const kickedBy = await findVoiceActor(guild, AuditLogEvent.MemberDisconnect);
        if (kickedBy) {
          return logToGuild(
            guild,
            {
              title: `🔇 ${who} اتطرد من الفويس`,
              color: COLORS.danger,
              thumbnail,
              fields: [
                { name: whoLabel, value: `${member}`, inline: true },
                { name: '📍 كان في', value: `${before.channel}`, inline: true },
                { name: '🔨 من جانب', value: `<@${kickedBy.id}>`, inline: true },
              ],
            },
            'voice'
          );
        }
        return logToGuild(
          guild,
          {
            title: `🔈 ${who} خرج من الفويس`,
            color: COLORS.neutral,
            thumbnail,
            fields: [
              { name: whoLabel, value: `${member}`, inline: true },
              { name: '📍 كان في', value: `${before.channel}`, inline: true },
            ],
          },
          'voice'
        );
      }

      // نقل
      if (before.channel && after.channel) {
        const movedBy = await findVoiceActor(guild, AuditLogEvent.MemberMove);
        const fields = [
          { name: whoLabel, value: `${member}`, inline: true },
          { name: '📤 من', value: `${before.channel}`, inline: true },
          { name: '📥 لـ', value: `${after.channel}`, inline: true },
        ];
        let title;
        if (movedBy) {
          fields.push({ name: '✋ من جانب', value: `<@${movedBy.id}>`, inline: true });
          title = `🔀 ${who} اتنقل بين رومات صوتية`;
        } else {
          title = `🔀 ${who} غيّر الروم الصوتي بنفسه`;
        }
        return logToGuild(guild, { title, color: COLORS.warning, thumbnail, fields }, 'voice');
      }
    },
  },
];
