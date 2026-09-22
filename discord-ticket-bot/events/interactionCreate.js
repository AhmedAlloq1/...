const {
  Events,
  MessageFlags,
} = require('discord.js');

const { isStaff } = require('../utils/permissions');
const embeds = require('../utils/embeds');

const {
  createTicketForUser,
  claimTicket,
  closeTicket,
  ticketActionRow,
  panelActionRow,
  closeRequestActionRow,
} = require('../utils/ticketManager');

const store = require('../utils/dataStore');
const { logTicketClose } = require('../utils/ticketLogger');

async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (error) {
    console.error('[REPLY ERROR]', error);
  }
}

async function handleCreateTicket(interaction, type) {
  const result = await createTicketForUser(
    interaction.guild,
    interaction.user,
    type
  );

  if (result.error === 'already_open') {
    return safeReply(interaction, {
      content: `❌ عندك تذكرة مفتوحة بالفعل: ${result.channel}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (result.error === 'missing_category') {
    return safeReply(interaction, {
      content: '❌ لم يتم تحديد كاتيجوري التذاكر في الإعدادات.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (result.error === 'category_not_found') {
    return safeReply(interaction, {
      content: '❌ كاتيجوري التذاكر غير موجودة.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await result.channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [
      embeds.ticketCreatedEmbed(
        interaction.user,
        type
      ),
    ],
    components: [
      ticketActionRow(),
    ],
  });

  return safeReply(interaction, {
    content: `✅ تم إنشاء تذكرتك: ${result.channel}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleClaim(interaction) {
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      content: '❌ هذا الزر مخصص لفريق الإدارة فقط.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = await claimTicket(
    interaction.channel,
    interaction.member
  );

  if (result.error === 'not_ticket') {
    return safeReply(interaction, {
      content: '❌ هذه القناة ليست تذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (result.error === 'closed') {
    return safeReply(interaction, {
      content: '❌ هذه التذكرة مغلقة بالفعل.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (result.error === 'already_claimed') {
    return safeReply(interaction, {
      content: `❌ التذكرة مستلمة بالفعل بواسطة <@${result.ticket.claimerId}>.`,
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
  } catch (error) {
    console.error('[CLAIM MESSAGE EDIT]', error);
  }

  return safeReply(interaction, {
    embeds: [
      embeds.ticketClaimedEmbed(
        interaction.user.id
      ),
    ],
  });
}

async function handleClose(interaction) {
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      content: '❌ إغلاق التذاكر متاح لفريق الإدارة فقط.',
      flags: MessageFlags.Ephemeral,
    });
  }

  return safeReply(interaction, {
    embeds: [
      embeds.closeRequestEmbed(
        interaction.user.id
      ),
    ],
    components: [
      closeRequestActionRow(),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleConfirmClose(interaction) {
  const ticket = store.getTicketByChannelId(
    interaction.channel.id
  );

  if (!ticket) {
    return safeReply(interaction, {
      content: '❌ هذه القناة ليست تذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (
    interaction.user.id !== ticket.creatorId &&
    !isStaff(interaction.member)
  ) {
    return safeReply(interaction, {
      content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.',
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
      content: '❌ تعذر إغلاق التذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await logTicketClose(
      interaction.guild,
      channel,
      result.ticket
    );
  } catch (error) {
    console.error('[TICKET LOG ERROR]', error);
  }

  await safeReply(interaction, {
    content: '🗑️ تم إغلاق التذكرة، سيتم حذف القناة...',
    flags: MessageFlags.Ephemeral,
  });

  setTimeout(async () => {
    try {
      await channel.delete(
        'Ticket closed'
      );
    } catch (error) {
      console.error('[CHANNEL DELETE ERROR]', error);
    }
  }, 1500);
}

async function handleCancelClose(interaction) {
  return safeReply(interaction, {
    content: '↩️ تم إلغاء إغلاق التذكرة.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands?.get(
          interaction.commandName
        );

        if (!command) return;

        await command.execute(interaction);
        return;
      }

      if (!interaction.isButton()) {
        return;
      }

      switch (interaction.customId) {
        case 'ticket_support':
          await handleCreateTicket(
            interaction,
            'support'
          );
          break;

        case 'ticket_team':
          await handleCreateTicket(
            interaction,
            'team'
          );
          break;

        case 'ticket_admin':
          await handleCreateTicket(
            interaction,
            'admin'
          );
          break;

        case 'ticket_claim':
          await handleClaim(interaction);
          break;

        case 'ticket_close':
          await handleClose(interaction);
          break;

        case 'ticket_confirm_close':
          await handleConfirmClose(interaction);
          break;

        case 'ticket_cancel_close':
          await handleCancelClose(interaction);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error(
        '[INTERACTION ERROR]',
        error
      );

      await safeReply(interaction, {
        content: '❌ حصل خطأ غير متوقع.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};