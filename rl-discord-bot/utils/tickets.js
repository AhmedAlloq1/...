const {
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config/config');

const PANEL_TITLE = '🎫 Support Tickets';

function sanitizeUsername(username) {
  return (
    username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'user'
  );
}

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(PANEL_TITLE)
    .setDescription(
      'هل تحتاج مساعدة؟\nاضغط على الزر بالأسفل لإنشاء Ticket مع الإدارة.'
    )
    .setFooter({ text: 'Rocket League Team' });
}

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Create Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary)
  );
}

/**
 * يرسل Ticket Panel في الروم إن لم يكن موجودًا بالفعل (Idempotent).
 * force=true يحذف الـ Panel القديم ويرسل واحدًا جديدًا (يُستخدم في /ticket-panel).
 */
async function sendTicketPanel(channel, { force = false } = {}) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);

  if (messages) {
    const existing = messages.filter(
      (m) => m.author.id === channel.client.user.id && m.embeds[0]?.title === PANEL_TITLE
    );

    if (existing.size > 0 && !force) {
      return existing.first();
    }
    if (existing.size > 0 && force) {
      for (const m of existing.values()) {
        await m.delete().catch(() => {});
      }
    }
  }

  return channel.send({ embeds: [buildPanelEmbed()], components: [buildPanelRow()] });
}

/**
 * يبحث عن تذكرة مفتوحة للعضو عبر الـ topic (بديل ثابت لا يعتمد على ذاكرة مؤقتة
 * تُفقد عند إعادة تشغيل البوت).
 */
function findOpenTicket(guild, userId) {
  return guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.topic === `ticket-owner:${userId}`
  );
}

async function createTicket(guild, member) {
  const category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === config.ticketCategory
  );

  const staffRoleObjs = config.staffRoles
    .map((name) => guild.roles.cache.find((r) => r.name === name))
    .filter(Boolean);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  for (const role of staffRoleObjs) {
    overwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${sanitizeUsername(member.user.username)}`,
    type: ChannelType.GuildText,
    parent: category ? category.id : undefined,
    topic: `ticket-owner:${member.id}`,
    permissionOverwrites: overwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎫 Ticket جديد')
    .addFields(
      { name: 'صاحب التذكرة', value: `<@${member.id}>`, inline: true },
      { name: 'وقت الإنشاء', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: 'الحالة', value: '🟢 مفتوحة', inline: true }
    )
    .setDescription('يرجى وصف مشكلتك بالتفصيل، سيقوم أحد أعضاء الإدارة بمساعدتك قريبًا.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
  return channel;
}

function isStaff(member) {
  return config.staffRoles.some((roleName) => member.roles.cache.some((r) => r.name === roleName));
}

module.exports = { sendTicketPanel, findOpenTicket, createTicket, isStaff, sanitizeUsername };
