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
  },

  team: {
    name: 'تقديم تيم',
    emoji: '🎮',
    prefix: 'team',
  },

  admin: {
    name: 'تقديم إدارة',
    emoji: '🛡️',
    prefix: 'admin',
  },
};

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
      .setStyle(ButtonStyle.Danger)
  );
}

function panelActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_support')
      .setLabel('دعم فني')
      .setEmoji('🛠️')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_team')
      .setLabel('التقديم على التيم')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('ticket_admin')
      .setLabel('التقديم على الإدارة')
      .setEmoji('🛡️')
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

async function createTicketForUser(guild, user, type = 'support') {
  const ticketType = TICKET_TYPES[type] || TICKET_TYPES.support;

  const existing = store.getOpenTicketByUser(user.id);

  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channelId);

    if (existingChannel) {
      return {
        error: 'already_open',
        channel: existingChannel,
        ticket: existing,
      };
    }
  }

  if (!config.ticketCategoryId) {
    return {
      error: 'missing_category',
    };
  }

  const category = guild.channels.cache.get(config.ticketCategoryId);

  if (!category) {
    return {
      error: 'category_not_found',
    };
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

  for (const roleId of config.staffRoleIds || []) {
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

  const username = sanitizeChannelName(user.username);

  const channelName =
    `${ticketType.prefix}-${username}`.slice(0, 100);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId,
    permissionOverwrites: overwrites,
    topic: `${ticketType.name} | ${user.tag}`,
  });

  const ticket = store.createTicket(channel.id, {
    creatorId: user.id,
    creatorTag: user.tag,
    type,
    typeName: ticketType.name,
  });

  return {
    channel,
    ticket,
    type,
  };
}

async function claimTicket(channel, staffMember) {
  const ticket = store.getTicketByChannelId(channel.id);

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

  for (const roleId of config.staffRoleIds || []) {
    await channel.permissionOverwrites.edit(roleId, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    });
  }

  await channel.permissionOverwrites.edit(staffMember.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    ManageMessages: true,
  });

  await channel.permissionOverwrites.edit(ticket.creatorId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  const updated = store.updateTicket(channel.id, {
    claimerId: staffMember.id,
    claimerTag: staffMember.user.tag,
  });

  return {
    ticket: updated,
  };
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

async function closeTicket(channel, closedByUser) {
  const ticket = store.getTicketByChannelId(channel.id);

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
    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: false,
    });
  }

  if (ticket.addedUserIds) {
    for (const userId of ticket.addedUserIds) {
      await channel.permissionOverwrites.edit(userId, {
        SendMessages: false,
      });
    }
  }

  const updated = store.updateTicket(channel.id, {
    status: 'closed',
    closedAt: Date.now(),
    closedById: closedByUser.id,
    closedByTag: closedByUser.tag,
  });

  return {
    ticket: updated,
  };
}

module.exports = {
  TICKET_TYPES,
  ticketActionRow,
  panelActionRow,
  closeRequestActionRow,
  createTicketForUser,
  claimTicket,
  addUserToTicket,
  renameTicket,
  closeTicket,
};