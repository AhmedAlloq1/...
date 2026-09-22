// events/interactionCreate.js

const { Events, MessageFlags } = require('discord.js');

const { isStaff } = require('../utils/permissions');

const {
  errorEmbed,
  ticketCreatedEmbed,
  ticketClaimedEmbed,
} = require('../utils/embeds');

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
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (err) {
    console.error(
      '[INTERACTION] Failed to reply to interaction:',
      err
    );
  }
}


/* =========================
   SLASH COMMANDS
========================= */

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(
    interaction.commandName
  );

  if (!command) {
    console.warn(
      `[COMMAND] Unknown command: ${interaction.commandName}`
    );

    return safeReply(interaction, {
      embeds: [
        errorEmbed(
          'This command is not recognized right now. Try again later.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(
      `[COMMAND] Error executing /${interaction.commandName}:`,
      err
    );

    await safeReply(interaction, {
      embeds: [
        errorEmbed(
          'Something went wrong running that command.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}


/* =========================
   CREATE TICKET
========================= */

async function handleCreateTicketButton(interaction) {
  const result = await createTicketForUser(
    interaction.guild,
    interaction.user
  );

  if (result.error) {
    return safeReply(interaction, {
      embeds: [errorEmbed(result.error)],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await result.channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [
        ticketCreatedEmbed(interaction.user),
      ],
      components: [
        ticketActionRow(),
      ],
    });
  } catch (err) {
    console.error(
      '[TICKETS] Failed to send ticket welcome message:',
      err
    );
  }

  return safeReply(interaction, {
    content:
      `✅ Your ticket has been created: <#${result.channel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}


/* =========================
   CLAIM TICKET
========================= */

async function handleClaimButton(interaction) {
  console.log(
    '🔥🔥🔥 CLAIM BUTTON WAS PRESSED 🔥🔥🔥'
  );

  console.log('[STAFF DEBUG]');

  console.log(
    'User:',
    interaction.user.tag
  );

  console.log(
    'User ID:',
    interaction.user.id
  );

  console.log(
    'Member roles:',
    interaction.member.roles.cache.map(
      role => `${role.name} (${role.id})`
    )
  );

  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(
          'Only Staff can claim tickets.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await claimTicket(
    interaction.channel,
    interaction.member
  );

  if (result.error) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(result.error),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.message.edit({
      components: [
        ticketActionRow({
          claimed: true,
        }),
      ],
    });
  } catch (err) {
    console.warn(
      '[INTERACTION] Could not disable claim button:',
      err.message
    );
  }

  return safeReply(interaction, {
    embeds: [
      ticketClaimedEmbed(
        interaction.user.id
      ),
    ],
  });
}


/* =========================
   CLOSE TICKET - STAFF
========================= */

async function handleCloseButton(interaction) {
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(
          'Only Staff can close tickets.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.channel;

  const result = await closeTicket(
    channel,
    interaction.user
  );

  if (result.error) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(result.error),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  /*
   * مهم:
   * نسجل الـ Log قبل حذف القناة
   */
  try {
    await logTicketClose(
      interaction.guild,
      channel,
      result.ticket
    );
  } catch (err) {
    console.error(
      '[TICKETS] Failed to create close log:',
      err
    );
  }

  await safeReply(interaction, {
    content:
      `🔒 Ticket closed by <@${interaction.user.id}>.\n🗑️ Deleting ticket...`,
  });

  /*
   * ننتظر لحظة بسيطة حتى تصل رسالة الإغلاق
   * ثم نحذف القناة
   */
  setTimeout(async () => {
    try {
      await channel.delete(
        'Ticket closed by Staff'
      );
    } catch (err) {
      console.error(
        '[TICKETS] Failed to delete closed ticket:',
        err
      );
    }
  }, 1500);
}


/* =========================
   CONFIRM CLOSE
========================= */

async function handleConfirmCloseButton(interaction) {
  const ticket = store.getTicketByChannel(
    interaction.channel.id
  );

  if (!ticket) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(
          'This ticket no longer exists.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  /*
   * فقط صاحب التذكرة يقدر يؤكد طلب الإغلاق
   */
  if (
    interaction.user.id !== ticket.creatorId
  ) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(
          'Only the ticket owner can respond to this request.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.channel;

  const result = await closeTicket(
    channel,
    interaction.user
  );

  if (result.error) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(result.error),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.message.edit({
      components: [],
    });
  } catch {
    // Non-fatal
  }

  /*
   * Log قبل حذف القناة
   */
  try {
    await logTicketClose(
      interaction.guild,
      channel,
      result.ticket
    );
  } catch (err) {
    console.error(
      '[TICKETS] Failed to create close log:',
      err
    );
  }

  await safeReply(interaction, {
    content:
      `🔒 Ticket closed by <@${interaction.user.id}>.\n🗑️ Deleting ticket...`,
  });

  setTimeout(async () => {
    try {
      await channel.delete(
        'Ticket closed by ticket owner'
      );
    } catch (err) {
      console.error(
        '[TICKETS] Failed to delete closed ticket:',
        err
      );
    }
  }, 1500);
}


/* =========================
   CANCEL CLOSE
========================= */

async function handleCancelCloseButton(interaction) {
  const ticket = store.getTicketByChannel(
    interaction.channel.id
  );

  if (
    ticket &&
    interaction.user.id !== ticket.creatorId
  ) {
    return safeReply(interaction, {
      embeds: [
        errorEmbed(
          'Only the ticket owner can respond to this request.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.message.edit({
      components: [],
    });
  } catch {
    // Non-fatal
  }

  return safeReply(interaction, {
    content:
      '❌ Close request cancelled — this ticket stays open.',
  });
}


/* =========================
   BUTTON HANDLERS
========================= */

const BUTTON_HANDLERS = {
  ticket_create:
    handleCreateTicketButton,

  ticket_claim:
    handleClaimButton,

  ticket_close:
    handleCloseButton,

  ticket_confirm_close:
    handleConfirmCloseButton,

  ticket_cancel_close:
    handleCancelCloseButton,
};


/* =========================
   EVENT
========================= */

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      /*
       * Slash Commands
       */
      if (interaction.isChatInputCommand()) {
        return handleSlashCommand(
          interaction
        );
      }

      /*
       * Buttons
       */
      if (interaction.isButton()) {
        const handler =
          BUTTON_HANDLERS[
            interaction.customId
          ];

        if (!handler) {
          return;
        }

        return handler(interaction);
      }

    } catch (err) {
      console.error(
        '[INTERACTION] Unhandled error:',
        err
      );

      await safeReply(interaction, {
        embeds: [
          errorEmbed(
            'Something went wrong handling that action.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};