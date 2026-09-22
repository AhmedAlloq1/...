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


// =====================================================
// CREATE TICKET
// =====================================================

async function handleCreateTicket(interaction, type) {
  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const result = await createTicketForUser(
      interaction.guild,
      interaction.user,
      type
    );

    if (result.error === 'already_open') {
      return interaction.editReply({
        content: `❌ عندك تذكرة مفتوحة بالفعل: ${result.channel}`,
      });
    }

    if (result.error === 'missing_category') {
      return interaction.editReply({
        content: '❌ لم يتم تحديد كاتيجوري التذاكر في الإعدادات.',
      });
    }

    if (result.error === 'category_not_found') {
      return interaction.editReply({
        content: '❌ كاتيجوري التذاكر غير موجودة.',
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

    return interaction.editReply({
      content: `✅ تم إنشاء تذكرتك بنجاح: ${result.channel}`,
    });

  } catch (error) {
    console.error('[CREATE TICKET ERROR]', error);

    return safeReply(interaction, {
      content: '❌ حصل خطأ أثناء إنشاء التذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }
}


// =====================================================
// CLAIM
// =====================================================

async function handleClaim(interaction) {
  try {
    // تأكيد الزر فورًا قبل أي عملية طويلة
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    if (!isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ هذا الزر مخصص لفريق الإدارة فقط.',
      });
    }

    const result = await claimTicket(
      interaction.channel,
      interaction.member
    );

    if (result.error === 'not_ticket') {
      return interaction.editReply({
        content: '❌ هذه القناة ليست تذكرة.',
      });
    }

    if (result.error === 'closed') {
      return interaction.editReply({
        content: '❌ هذه التذكرة مغلقة بالفعل.',
      });
    }

    if (result.error === 'already_claimed') {
      return interaction.editReply({
        content:
          `❌ التذكرة مستلمة بالفعل بواسطة <@${result.ticket.claimerId}>.`,
      });
    }

    // تحديث أزرار التذكرة
    try {
      await interaction.message.edit({
        components: [
          ticketActionRow({
            claimed: true,
          }),
        ],
      });
    } catch (error) {
      console.error(
        '[CLAIM BUTTON EDIT ERROR]',
        error
      );
    }

    return interaction.editReply({
      embeds: [
        embeds.ticketClaimedEmbed(
          interaction.user.id
        ),
      ],
    });

  } catch (error) {
    console.error(
      '[CLAIM ERROR]',
      error
    );

    return safeReply(interaction, {
      content: '❌ حصل خطأ أثناء استلام التذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }
}


// =====================================================
// CLOSE BUTTON
// =====================================================

async function handleClose(interaction) {
  try {
    if (!isStaff(interaction.member)) {
      return safeReply(interaction, {
        content:
          '❌ إغلاق التذاكر متاح لفريق الإدارة فقط.',
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

  } catch (error) {
    console.error(
      '[CLOSE BUTTON ERROR]',
      error
    );
  }
}


// =====================================================
// CONFIRM CLOSE
// =====================================================

async function handleConfirmClose(interaction) {
  try {
    // نعمل defer فورًا
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const ticket = store.getTicketByChannelId(
      interaction.channel.id
    );

    if (!ticket) {
      return interaction.editReply({
        content: '❌ هذه القناة ليست تذكرة.',
      });
    }

    if (ticket.status !== 'open') {
      return interaction.editReply({
        content: '❌ هذه التذكرة مغلقة بالفعل.',
      });
    }

    // صاحب التذكرة أو Staff فقط
    if (
      interaction.user.id !== ticket.creatorId &&
      !isStaff(interaction.member)
    ) {
      return interaction.editReply({
        content:
          '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.',
      });
    }

    const channel = interaction.channel;

    const result = await closeTicket(
      channel,
      interaction.user
    );

    if (result.error) {
      return interaction.editReply({
        content:
          '❌ تعذر إغلاق التذكرة.',
      });
    }

    // تسجيل الـLog قبل حذف القناة
    try {
      await logTicketClose(
        interaction.guild,
        channel,
        result.ticket
      );
    } catch (error) {
      console.error(
        '[TICKET LOG ERROR]',
        error
      );
    }

    await interaction.editReply({
      content:
        '🔒 تم إغلاق التذكرة.\n🗑️ سيتم حذف القناة خلال لحظات...',
    });

    // حذف القناة
    setTimeout(async () => {
      try {
        if (channel.deletable) {
          await channel.delete(
            'Ticket closed'
          );
        } else {
          console.error(
            '[CHANNEL DELETE ERROR] Bot cannot delete this channel.'
          );
        }
      } catch (error) {
        console.error(
          '[CHANNEL DELETE ERROR]',
          error
        );
      }
    }, 1500);

  } catch (error) {
    console.error(
      '[CONFIRM CLOSE ERROR]',
      error
    );

    return safeReply(interaction, {
      content:
        '❌ حصل خطأ أثناء إغلاق التذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }
}


// =====================================================
// CANCEL CLOSE
// =====================================================

async function handleCancelClose(interaction) {
  try {
    return safeReply(interaction, {
      content:
        '↩️ تم إلغاء إغلاق التذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error(
      '[CANCEL CLOSE ERROR]',
      error
    );
  }
}


// =====================================================
// MAIN INTERACTION
// =====================================================

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {

      // ================================
      // SLASH COMMANDS
      // ================================

      if (interaction.isChatInputCommand()) {
        const command =
          interaction.client.commands?.get(
            interaction.commandName
          );

        if (!command) return;

        await command.execute(
          interaction
        );

        return;
      }


      // ================================
      // BUTTONS
      // ================================

      if (!interaction.isButton()) {
        return;
      }

      switch (interaction.customId) {

        // Ticket types
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


        // Ticket actions
        case 'ticket_claim':
          await handleClaim(
            interaction
          );
          break;

        case 'ticket_close':
          await handleClose(
            interaction
          );
          break;


        // Close confirmation
        case 'ticket_confirm_close':
          await handleConfirmClose(
            interaction
          );
          break;

        case 'ticket_cancel_close':
          await handleCancelClose(
            interaction
          );
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
        content:
          '❌ حصل خطأ غير متوقع.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};