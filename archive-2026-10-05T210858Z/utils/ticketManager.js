
const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const config = require('./config');
const store = require('./dataStore');

const TICKET_VIEW_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.EmbedLinks,
];

const TICKET_TYPES = {
  support: {
    name: 'دعم فني',
    emoji: '🛠️',
    prefix: 'support',
    pingMessage:
      '🔔 {role} — تذكرة **دعم فني** جديدة من {user}، برجاء استلامها.',
  },

  team: {
    name: 'تقديم تيم',
    emoji: '👤',
    prefix: 'mod',
    pingMessage:
      '🔔 {role} — طلب **تقديم تيم** جديد من {user}، برجاء المراجعة.',
  },

  admin: {
    name: 'تقديم ايدتور',
    emoji: '📋',
    prefix: 'editor',
    pingMessage:
      '🔔 {role} — طلب **تقديم ايدتور** جديد من {user}، برجاء المراجعة.',
  },
};

function typeKey(type) {
  return TICKET_TYPES[type] ? type : 'support';
}

// تحديد كاتيجوري النوع، أو الكاتيجوري الافتراضية من .env.
function getCategoryId(type) {
  const key = typeKey(type);

  return (
    config.ticketCategoryIds?.[key] ||
    config.ticketCategoryId ||
    null
  );
}

// تحديد رتبة المنشن.
function getPingRoleId(type) {
  const key = typeKey(type);

  return (
    config.ticketPingRoleIds?.[key] ||
    config.ticketPingRoleId ||
    null
  );
}

function buildTicketPing(user, type = 'support') {
  const key = typeKey(type);
  const roleId = getPingRoleId(key);

  const content = TICKET_TYPES[key].pingMessage
    .replace('{user}', `<@${user.id}>`)
    .replace('{role}', roleId ? `<@&${roleId}>` : '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    content,
    allowedMentions: {
      users: [user.id],
      roles: roleId ? [roleId] : [],
    },
  };
}

function sanitizeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

function ticketActionRow({ claimed = false } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimed ? 'تم استلام التذكرة' : 'استلام التذكرة')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(claimed),

    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('إغلاق التذكرة')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('ticket_report')
      .setLabel('Staff Report')
      .setEmoji('🚩')
      .setStyle(ButtonStyle.Secondary)
  );
}

function panelEmbed() {
  return {
    color: 0xC9A227,
    title: '⚜️ إدارة سيرفر TRX',
    description:
      'مرحبًا بك في نظام التذاكر الخاص بإدارة سيرفر **TRX**.\n\n' +
      'يرجى اختيار القسم المناسب من الأزرار بالأسفل، وسيتم التعامل مع طلبك من قِبل الإدارة المختصة.\n\n' +
      '🛠️ **الدعم الفني**\n' +
      'لطرح المشاكل والاستفسارات أو طلب المساعدة بخصوص السيرفر.\n\n' +
      '👤 **التقديم على تيم**\n' +
      'لمن يرغب في التقديم للانضمام إلى فريق التيم في سيرفر **TRX**.\n\n' +
      '📋 **التقديم على ايدتور**\n' +
      'لمن يرغب في التقديم للعمل كايدتور ضمن سيرفر **TRX**.\n\n' +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      '📌 **يرجى اختيار القسم المناسب لطلبك وعدم فتح أكثر من تذكرة لنفس الموضوع.**\n\n' +
      '⚜️ **TRX • Server Management**',
  };
}

function panelActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_support')
      .setLabel('الدعم الفني')
      .setEmoji('🛠️')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('ticket_team')
      .setLabel('التقديم على تيم')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_admin')
      .setLabel('التقديم على ايدتور')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
  );
}

function closeRequestActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_confirm_close')
      .setLabel('تأكيد الإغلاق')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('ticket_cancel_close')
      .setLabel('إلغاء')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );
}

// إنشاء تذكرة جديدة.
async function createTicketForUser(guild, user, type = 'support') {
  const key = typeKey(type);
  const ticketType = TICKET_TYPES[key];

  // منع المستخدم من فتح تذكرة أخرى أثناء وجود تذكرة مفتوحة.
  const existing = store.getOpenTicketByUser(user.id);

  if (existing) {
    const existingChannel =
      guild.channels.cache.get(existing.channelId);

    if (existingChannel) {
      return {
        error: 'already_open',
        channel: existingChannel,
        ticket: existing,
      };
    }
  }

  // مكان إنشاء التذكرة: الكاتيجوري المحددة في .env.
  const categoryId = getCategoryId(key);

  if (!categoryId) {
    return { error: 'missing_category' };
  }

  const category =
    guild.channels.cache.get(categoryId) ||
    await guild.channels.fetch(categoryId).catch(() => null);

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    return { error: 'category_not_found' };
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: user.id,
      allow: TICKET_VIEW_PERMS,
    },
  ];

  const staffRoleIds = [
    ...new Set(config.staffRoleIds || []),
  ];

  for (const roleId of staffRoleIds) {
    // تجاهل الرتب التي لم تعد موجودة في السيرفر.
    if (!guild.roles.cache.has(roleId)) continue;

    overwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
      ],
    });
  }

  const pingRoleId = getPingRoleId(key);

  if (
    pingRoleId &&
    !staffRoleIds.includes(pingRoleId) &&
    guild.roles.cache.has(pingRoleId)
  ) {
    overwrites.push({
      id: pingRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  const username = sanitizeChannelName(user.username);

  const channelName = `${ticketType.prefix}-${username}`.slice(0, 100);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,

    // يضع كل التذاكر في الكاتيجوري المحددة أعلاه.
    parent: category.id,

    permissionOverwrites: overwrites,
    topic: `${ticketType.name} | ${user.tag}`,
  });

  try {
    const ticket = store.createTicket(channel.id, {
      creatorId: user.id,
      creatorTag: user.tag,
      type: key,
      typeName: ticketType.name,
      pingRoleId: pingRoleId || null,
    });

    return {
      channel,
      ticket,
      type: key,
    };
  } catch (error) {
    // لا نترك قناة يتيمة لو فشل حفظ التذكرة.
    await channel.delete().catch(() => {});
    throw error;
  }
}

// استلام التذكرة.
async function claimTicket(channel, staffMember) {
  const ticket = store.getTicketByChannelId(channel.id);

  if (!ticket) return { error: 'not_ticket' };
  if (ticket.status === 'closed') return { error: 'closed' };

  if (ticket.claimerId) {
    return { error: 'already_claimed', ticket };
  }

  // إخفاء التذكرة من بقية رتب الفريق.
  const rolesToHide = [
    ...new Set([
      ...(config.staffRoleIds || []),
      ...(ticket.pingRoleId ? [ticket.pingRoleId] : []),
    ]),
  ];

  for (const roleId of rolesToHide) {
    const role = channel.guild.roles.cache.get(roleId);

    if (!role || roleId === staffMember.guild.id) continue;

    await channel.permissionOverwrites.edit(roleId, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    }).catch(error => {
      if (error.code !== 10009) throw error;
    });
  }

  await channel.permissionOverwrites.edit(staffMember.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    ManageMessages: true,
  });

  // تحديث بيانات صاحب التذكرة فقط لو الـ overwrite موجود.
  const creatorOverwrite =
    channel.permissionOverwrites.cache.get(ticket.creatorId);

  if (creatorOverwrite) {
    await creatorOverwrite.edit({
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });
  }

  const updated = store.updateTicket(channel.id, {
    claimerId: staffMember.id,
    claimerTag: staffMember.user.tag,
  });

  return { ticket: updated };
}

async function addUserToTicket(channel, userId) {
  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  return true;
}

async function renameTicket(channel, newName) {
  const safeName = sanitizeChannelName(newName);
  await channel.setName(safeName);
  return true;
}

// إغلاق التذكرة دون محاولة تعديل overwrite غير موجود.
async function closeTicket(channel, closedByUser) {
  const ticket = store.getTicketByChannelId(channel.id);

  if (!ticket) return { error: 'not_ticket' };

  if (ticket.status === 'closed') {
    return { error: 'already_closed', ticket };
  }

  const creatorOverwrite =
    ticket.creatorId
      ? channel.permissionOverwrites.cache.get(ticket.creatorId)
      : null;

  if (creatorOverwrite) {
    await creatorOverwrite.edit({
      SendMessages: false,
    });
  }

  if (Array.isArray(ticket.addedUserIds)) {
    for (const userId of ticket.addedUserIds) {
      const overwrite =
        channel.permissionOverwrites.cache.get(userId);

      if (overwrite) {
        await overwrite.edit({
          SendMessages: false,
        });
      }
    }
  }

  const updated = store.updateTicket(channel.id, {
    status: 'closed',
    closedAt: Date.now(),
    closedById: closedByUser.id,
    closedByTag: closedByUser.tag,
  });

  return { ticket: updated };
}

module.exports = {
  TICKET_TYPES,
  ticketActionRow,
  panelActionRow,
  panelEmbed,
  closeRequestActionRow,
  createTicketForUser,
  buildTicketPing,
  claimTicket,
  addUserToTicket,
  renameTicket,
  closeTicket,
};
