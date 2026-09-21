// events/interactionCreate.js
const { Events, MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { errorEmbed, ticketCreatedEmbed, ticketClaimedEmbed } = require('../utils/embeds');
const {
  createTicketForUser,
  claimTicket,
  closeTicket,
  ticketActionRow,
} = require('../utils/ticketManager');
const { logTicketClose } = require('../utils/ticketLogger');
const store = require('../utils/dataStore');

async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (err) {
    console.error('[INTERACTION] Failed to reply to interaction:', err);
  }
}

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[COMMAND] Unknown command: ${interaction.commandName}`);
    return safeReply(interaction, {
      embeds: [errorEmbed('This command is not recognized right now. Try again later.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[COMMAND] Error executing /${interaction.commandName}:`, err);
    await safeReply(interaction, {
      embeds: [errorEmbed('Something went wrong running that command.')],
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleCreateTicketButton(interaction) {
  const result = await createTicketForUser(interaction.guild, interaction.user);
  if (result.error) {
    return safeReply(interaction, { embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
  }

  await result.channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [ticketCreatedEmbed(interaction.user.id)],
    components: [ticketActionRow()],
  });

  return safeReply(interaction, {
    content: `✅ Your ticket has been created: <#${result.channel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleClaimButton(interaction) {
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [errorEmbed('Only Staff can claim tickets.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await claimTicket(interaction.channel, interaction.member);
  if (result.error) {
    return safeReply(interaction, { embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
  }

  try {
    await interaction.message.edit({ components: [ticketActionRow({ claimed: true })] });
  } catch (err) {
    console.warn('[INTERACTION] Could not disable claim button:', err.message);
  }

  return safeReply(interaction, { embeds: [ticketClaimedEmbed(interaction.user.id)] });
}

async function handleCloseButton(interaction) {
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [errorEmbed('Only Staff can close tickets.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await closeTicket(interaction.channel, interaction.user);
  if (result.error) {
    return safeReply(interaction, { embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
  }

  await safeReply(interaction, { content: `🔒 Ticket closed by <@${interaction.user.id}>.` });
  await logTicketClose(interaction.guild, interaction.channel, result.ticket);
}

async function handleConfirmCloseButton(interaction) {
  const ticket = store.getTicketByChannel(interaction.channel.id);
  if (!ticket) {
    return safeReply(interaction, {
      embeds: [errorEmbed('This ticket no longer exists.')],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (interaction.user.id !== ticket.creatorId) {
    return safeReply(interaction, {
      embeds: [errorEmbed('Only the ticket owner can respond to this request.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await closeTicket(interaction.channel, interaction.user);
  if (result.error) {
    return safeReply(interaction, { embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
  }

  try {
    await interaction.message.edit({ components: [] });
  } catch {
    /* non-fatal */
  }

  await safeReply(interaction, { content: `🔒 Ticket closed by <@${interaction.user.id}>.` });
  await logTicketClose(interaction.guild, interaction.channel, result.ticket);
}

async function handleCancelCloseButton(interaction) {
  const ticket = store.getTicketByChannel(interaction.channel.id);
  if (ticket && interaction.user.id !== ticket.creatorId) {
    return safeReply(interaction, {
      embeds: [errorEmbed('Only the ticket owner can respond to this request.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.message.edit({ components: [] });
  } catch {
    /* non-fatal */
  }

  return safeReply(interaction, { content: 'Close request cancelled — this ticket stays open.' });
}

const BUTTON_HANDLERS = {
  ticket_create: handleCreateTicketButton,
  ticket_claim: handleClaimButton,
  ticket_close: handleCloseButton,
  ticket_confirm_close: handleConfirmCloseButton,
  ticket_cancel_close: handleCancelCloseButton,
};

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        return handleSlashCommand(interaction);
      }

      if (interaction.isButton()) {
        const handler = BUTTON_HANDLERS[interaction.customId];
        if (!handler) return;
        return handler(interaction);
      }
    } catch (err) {
      // Final safety net: no interaction should ever bubble up and crash the process.
      console.error('[INTERACTION] Unhandled error:', err);
      await safeReply(interaction, {
        embeds: [errorEmbed('Something went wrong handling that action.')],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
