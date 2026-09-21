// utils/ticketManager.js
const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('./config');
const store = require('./dataStore');
const embeds = require('./embeds');

const TICKET_VIEW_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.EmbedLinks,
];

function sanitizeChannelName(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90); // Discord channel name hard limit is 100; leave headroom for prefixes.
}

function ticketActionRow({ claimed = false } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Claim')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(claimed),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function panelActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Create Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Success)
  );
}

function closeRequestActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_confirm_close')
      .setLabel('Confirm Close')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_cancel_close')
      .setLabel('Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Creates a new ticket channel for a user, or returns an error reason
 * if they already have one open.
 */
async function createTicketForUser(guild, user) {
  const existing = store.getOpenTicketByUser(user.id);
  if (existing) {
    return { error: 'You already have an open ticket.' };
  }

  if (!config.ticketCategoryId) {
    return { error: 'The ticket system is not fully configured yet (missing ticket category). Please contact an administrator.' };
  }

  const category = guild.channels.cache.get(config.ticketCategoryId);
  if (!category) {
    return { error: 'The ticket category could not be found. Please contact an administrator.' };
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

  for (const roleId of config.staffRoleIds) {
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

  const channelName = `ticket-${sanitizeChannelName(user.username)}`.slice(0, 90);

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName || `ticket-${user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites,
    });
  } catch (err) {
    console.error('[TICKETS] Failed to create ticket channel:', err);
    return { error: 'I was unable to create the ticket channel. I may be missing permissions.' };
  }

  store.createTicket(channel.id, {
    creatorId: user.id,
    creatorTag: user.tag,
  });

  return { channel };
}

/**
 * Claims a ticket for a staff member: keeps creator + claimer,
 * strips view access from every other staff role on this channel only.
 */
async function claimTicket(channel, staffMember) {
  const ticket = store.getTicketByChannel(channel.id);
  if (!ticket) return { error: 'This channel is not an active ticket.' };
  if (ticket.status !== 'open') return { error: 'This ticket is already closed.' };
  if (ticket.claimerId) return { error: `This ticket has already been claimed by <@${ticket.claimerId}>.` };

  try {
    // Remove view access for every staff role on this specific channel.
    for (const roleId of config.staffRoleIds) {
      await channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(() => {});
    }

    // Grant the claiming staff member explicit access.
    await channel.permissionOverwrites.edit(staffMember.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageChannels: true,
      ManageMessages: true,
    });

    // Re-affirm access for the creator and any previously added users.
    await channel.permissionOverwrites.edit(ticket.creatorId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
    for (const addedId of ticket.addedUserIds || []) {
      await channel.permissionOverwrites.edit(addedId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
    }
  } catch (err) {
    console.error('[TICKETS] Failed to update permissions on claim:', err);
    return { error: 'I was unable to update channel permissions. I may be missing the Manage Permissions permission.' };
  }

  store.updateTicket(channel.id, { claimerId: staffMember.id });
  return { ticket: store.getTicketByChannel(channel.id) };
}

/**
 * Adds a user to a ticket with limited (non-staff) access.
 */
async function addUserToTicket(channel, targetUser) {
  const ticket = store.getTicketByChannel(channel.id);
  if (!ticket) return { error: 'This channel is not an active ticket.' };
  if (ticket.status !== 'open') return { error: 'This ticket is closed.' };

  if (ticket.addedUserIds?.includes(targetUser.id) || ticket.creatorId === targetUser.id) {
    return { error: 'That user already has access to this ticket.' };
  }

  try {
    await channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });
  } catch (err) {
    console.error('[TICKETS] Failed to add user to ticket:', err);
    return { error: 'I was unable to update channel permissions. I may be missing the Manage Permissions permission.' };
  }

  const updated = store.updateTicket(channel.id, {
    addedUserIds: [...(ticket.addedUserIds || []), targetUser.id],
  });
  return { ticket: updated };
}

/**
 * Renames a ticket channel, sanitizing the provided name.
 */
async function renameTicket(channel, rawName) {
  const ticket = store.getTicketByChannel(channel.id);
  if (!ticket) return { error: 'This command can only be used inside a ticket.' };

  const sanitized = sanitizeChannelName(rawName);
  if (!sanitized) {
    return { error: 'That name is not valid. Use letters, numbers, hyphens or underscores.' };
  }

  try {
    await channel.setName(sanitized);
  } catch (err) {
    console.error('[TICKETS] Failed to rename channel:', err);
    return { error: 'I was unable to rename this channel. I may be missing permissions.' };
  }

  return { newName: sanitized };
}

/**
 * Immediately closes a ticket: locks it down for the creator/normal
 * users, renames it, and marks it closed in storage. Does not delete it.
 */
async function closeTicket(channel, closedByUser) {
  const ticket = store.getTicketByChannel(channel.id);
  if (!ticket) return { error: 'This channel is not an active ticket.' };
  if (ticket.status === 'closed') return { error: 'This ticket is already closed.' };

  try {
    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: false,
      ViewChannel: true,
    }).catch(() => {});

    for (const addedId of ticket.addedUserIds || []) {
      await channel.permissionOverwrites.edit(addedId, { SendMessages: false }).catch(() => {});
    }

    const usernamePart = sanitizeChannelName(ticket.creatorTag || ticket.creatorId).slice(0, 60);
    const newName = `closed-${usernamePart || ticket.creatorId}`.slice(0, 90);
    await channel.setName(newName).catch((err) => {
      console.warn('[TICKETS] Could not rename channel on close:', err.message);
    });
  } catch (err) {
    console.error('[TICKETS] Failed while closing ticket:', err);
    return { error: 'I ran into a problem closing this ticket. I may be missing permissions.' };
  }

  const updated = store.updateTicket(channel.id, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    closedById: closedByUser.id,
  });

  return { ticket: updated };
}

module.exports = {
  sanitizeChannelName,
  ticketActionRow,
  panelActionRow,
  closeRequestActionRow,
  createTicketForUser,
  claimTicket,
  addUserToTicket,
  renameTicket,
  closeTicket,
};
