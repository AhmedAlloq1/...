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
    // الكلام المحفوظ اللي بيتبعت مع منشن الرول
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

// كاتيجوري النوع ده (أو الافتراضية)
function getCategoryId(type) {
  return (
    config.ticketCategoryIds?.[typeKey(type)] ||
    config.ticketCategoryId ||
    null
  );
}

// رول المنشن للنوع ده (أو الرول العام)
function getPingRoleId(type) {
  return (
    config.ticketPingRoleIds?.[typeKey(type)] ||
    config.ticketPingRoleId ||
    null
  );
}

// يبني رسالة "منشن الرول + الكلام المحفوظ"
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
      .setLabel(
        claimed
          ? 'تم استلام التذكرة'
          : 'استلام التذكرة'
      )
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

async function createTicketForUser(
  guild,
  user,
  type = 'support'
) {
  const ticketType =
    TICKET_TYPES[type] || TICKET_TYPES.support;

  const existing =
    store.getOpenTicketByUser(user.id);

  if (existing) {
    const existingChannel =
      guild.channels.cache.get(
        existing.channelId
      );

    if (existingChannel) {
      return {
        error: 'already_open',
        channel: existingChannel,
        ticket: existing,
      };
    }
  }

  const categoryId = getCategoryId(type);

  if (!categoryId) {
    return {
      error: 'missing_category',
    };
  }

  const category =
    guild.channels.cache.get(categoryId);

  if (!category) {
    return {
      error: 'category_not_found',
    };
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionsBitField.Flags.ViewChannel,
      ],
    },

    {
      id: user.id,
      allow: TICKET_VIEW_PERMS,
    },
  ];

  for (
    const roleId of config.staffRoleIds || []
  ) {
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

  // رول المنشن لازم يشوف التذكرة حتى لو مش ضمن STAFF_ROLE_IDS
  const pingRoleId = getPingRoleId(type);

  if (
    pingRoleId &&
    !(config.staffRoleIds || []).includes(pingRoleId)
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

  const username =
    sanitizeChannelName(user.username);

  const channelName = [
    ticketType.prefix,
    username,
  ]
    .filter(Boolean)
    .join('-')
    .slice(0, 100);

  const channel =
    await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: overwrites,
      topic:
        ticketType.name +
        ' | ' +
        user.tag,
    });

  const ticket = store.createTicket(
    channel.id,
    {
      creatorId: user.id,
      creatorTag: user.tag,
      type,
      typeName: ticketType.name,
      pingRoleId: pingRoleId || null,
    }
  );

  return {
    channel,
    ticket,
    type,
  };
}

async function claimTicket(
  channel,
  staffMember
) {
  const ticket =
    store.getTicketByChannelId(
      channel.id
    );

  if (!ticket) {
    return {
      error: 'not_ticket',
    };
  }

  if (ticket.status === 'closed') {
    return {
      error: 'closed',
    };
  }

  if (ticket.claimerId) {
    return {
      error: 'already_claimed',
      ticket,
    };
  }

  const rolesToHide = [
    ...new Set([
      ...(config.staffRoleIds || []),
      ...(ticket.pingRoleId
        ? [ticket.pingRoleId]
        : []),
    ]),
  ];

  for (const roleId of rolesToHide) {
    await channel.permissionOverwrites.edit(
      roleId,
      {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false,
      }
    );
  }

  await channel.permissionOverwrites.edit(
    staffMember.id,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageMessages: true,
    }
  );

  await channel.permissionOverwrites.edit(
    ticket.creatorId,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    }
  );

  const updated =
    store.updateTicket(
      channel.id,
      {
        claimerId: staffMember.id,
        claimerTag: staffMember.user.tag,
      }
    );

  return {
    ticket: updated,
  };
}

async function addUserToTicket(
  channel,
  userId
) {
  await channel.permissionOverwrites.edit(
    userId,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    }
  );

  return true;
}

async function renameTicket(
  channel,
  newName
) {
  const safeName =
    sanitizeChannelName(newName);

  await channel.setName(safeName);

  return true;
}

async function closeTicket(
  channel,
  closedByUser
) {
  const ticket =
    store.getTicketByChannelId(
      channel.id
    );

  if (!ticket) {
    return {
      error: 'not_ticket',
    };
  }

  if (ticket.status === 'closed') {
    return {
      error: 'already_closed',
      ticket,
    };
  }

  if (ticket.creatorId) {
    await channel.permissionOverwrites.edit(
      ticket.creatorId,
      {
        SendMessages: false,
      }
    );
  }

  if (ticket.addedUserIds) {
    for (
      const userId of ticket.addedUserIds
    ) {
      await channel.permissionOverwrites.edit(
        userId,
        {
          SendMessages: false,
        }
      );
    }
  }

  const updated =
    store.updateTicket(
      channel.id,
      {
        status: 'closed',
        closedAt: Date.now(),
        closedById: closedByUser.id,
        closedByTag: closedByUser.tag,
      }
    );

  return {
    ticket: updated,
  };
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