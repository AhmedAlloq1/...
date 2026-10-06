const fs = require('fs');
const path = require('path');

const {
  Events,
  MessageFlags,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

const {
  isStaff,
  isSupport,
  getSupportRoleIds,
} = require('../utils/permissions');

const {
  logToGuild,
  getLogChannel,
  COLORS,
} = require('../utils/logger');

const embeds = require('../utils/embeds');

const {
  createTicketForUser,
  buildTicketPing,
  claimTicket,
  closeTicket,
  ticketActionRow,
  closeRequestActionRow,
} = require('../utils/ticketManager');

const store = require('../utils/dataStore');

const {
  logTicketClose,
  logTicketOpen,
} = require('../utils/ticketLogger');

// =====================================================
// TEMP VOICE
// =====================================================

const tempVoice = require('./tempVoice');

// =====================================================
// TICKET BANNER
// =====================================================

const BANNER_PATH = path.join(
  __dirname,
  '..',
  'assets',
  'welcome-banner.png'
);

// =====================================================
// SAFE REPLY
// =====================================================

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

    // -----------------------------------------------
    // ERRORS
    // -----------------------------------------------

    if (result.error === 'already_open') {
      return interaction.editReply({
        content: `❌ عندك تذكرة مفتوحة بالفعل: ${result.channel}`,
      });
    }

    if (result.error === 'missing_category') {
      return interaction.editReply({
        content:
          '❌ لم يتم تحديد كاتيجوري التذاكر في الإعدادات.',
      });
    }

    if (result.error === 'category_not_found') {
      return interaction.editReply({
        content:
          '❌ كاتيجوري التذاكر غير موجودة.',
      });
    }

    // -----------------------------------------------
    // TICKET PING
    // -----------------------------------------------

    const ping = buildTicketPing(
      interaction.user,
      type
    );

    // -----------------------------------------------
    // CHECK BANNER
    // -----------------------------------------------

    const hasBanner =
      fs.existsSync(BANNER_PATH);

    if (!hasBanner) {
      console.warn(
        `[TICKET BANNER] Banner not found: ${BANNER_PATH}`
      );
    } else {
      console.log(
        '[TICKET BANNER] Banner found and will be attached.'
      );
    }

    // -----------------------------------------------
    // SEND TICKET WELCOME EMBED
    // -----------------------------------------------

    await result.channel.send({
      content: ping.content,

      allowedMentions:
        ping.allowedMentions,

      embeds: [
        embeds.ticketCreatedEmbed(
          interaction.user,
          type,
          {
            withBanner: hasBanner,
          }
        ),
      ],

      files: hasBanner
        ? [
            new AttachmentBuilder(
              BANNER_PATH,
              {
                name:
                  embeds.TICKET_BANNER_NAME,
              }
            ),
          ]
        : [],

      components: [
        ticketActionRow(),
      ],
    });

    // -----------------------------------------------
    // TICKET OPEN LOG
    // -----------------------------------------------

    logTicketOpen(
      interaction.guild,
      result.channel,
      result.ticket
    ).catch((error) => {
      console.error(
        '[TICKET LOG ERROR]',
        error
      );
    });

    // -----------------------------------------------
    // APPLICATION QUESTIONS
    // -----------------------------------------------

    const questionsEmbed =
      embeds.applicationQuestionsEmbed(type);

    if (questionsEmbed) {
      await result.channel.send({
        content: `<@${interaction.user.id}>`,

        allowedMentions: {
          users: [
            interaction.user.id,
          ],
        },

        embeds: [
          questionsEmbed,
        ],
      });
    }

    // -----------------------------------------------
    // SUCCESS
    // -----------------------------------------------

    return interaction.editReply({
      content:
        `✅ تم إنشاء تذكرتك بنجاح: ${result.channel}`,
    });

  } catch (error) {
    console.error(
      '[CREATE TICKET ERROR]',
      error
    );

    return safeReply(interaction, {
      content:
        '❌ حصل خطأ أثناء إنشاء التذكرة.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// =====================================================
// CLAIM
// =====================================================

async function handleClaim(interaction) {
  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    if (getSupportRoleIds().length === 0) {
      return interaction.editReply({
        content:
          '❌ رول السبورت غير محدد في ملف الإعدادات.',
      });
    }

    if (!isSupport(interaction.member)) {
      return interaction.editReply({
        content:
          '❌ استلام التذاكر مخصص لفريق السبورت فقط.',
      });
    }

    const result = await claimTicket(
      interaction.channel,
      interaction.member
    );

    if (result.error === 'not_ticket') {
      return interaction.editReply({
        content:
          '❌ هذه القناة ليست تذكرة.',
      });
    }

    if (result.error === 'closed') {
      return interaction.editReply({
        content:
          '❌ هذه التذكرة مغلقة بالفعل.',
      });
    }

    if (
      result.error ===
      'already_claimed'
    ) {
      return interaction.editReply({
        content:
          `❌ التذكرة مستلمة بالفعل بواسطة <@${result.ticket.claimerId}>.`,
      });
    }

    // -----------------------------------------------
    // UPDATE BUTTONS
    // -----------------------------------------------

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
      content:
        '❌ حصل خطأ أثناء استلام التذكرة.',
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

async function handleConfirmClose(
  interaction
) {
  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const ticket =
      store.getTicketByChannelId(
        interaction.channel.id
      );

    if (!ticket) {
      return interaction.editReply({
        content:
          '❌ هذه القناة ليست تذكرة.',
      });
    }

    if (ticket.status !== 'open') {
      return interaction.editReply({
        content:
          '❌ هذه التذكرة مغلقة بالفعل.',
      });
    }

    // -----------------------------------------------
    // PERMISSIONS
    // -----------------------------------------------

    if (
      interaction.user.id !==
        ticket.creatorId &&
      !isStaff(interaction.member)
    ) {
      return interaction.editReply({
        content:
          '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.',
      });
    }

    const channel =
      interaction.channel;

    const result =
      await closeTicket(
        channel,
        interaction.user
      );

    if (result.error) {
      return interaction.editReply({
        content:
          '❌ تعذر إغلاق التذكرة.',
      });
    }

    // -----------------------------------------------
    // LOG
    // -----------------------------------------------

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

    // -----------------------------------------------
    // DELETE CHANNEL
    // -----------------------------------------------

    setTimeout(
      async () => {
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
      },
      1500
    );

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
// STAFF REPORT BUTTON
// =====================================================

async function handleReportButton(
  interaction
) {
  try {
    const ticket =
      store.getTicketByChannelId(
        interaction.channel.id
      );

    if (!ticket) {
      return safeReply(interaction, {
        content:
          '❌ هذه القناة ليست تذكرة.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (
      interaction.user.id !==
      ticket.creatorId
    ) {
      return safeReply(interaction, {
        content:
          '❌ فقط صاحب التذكرة يقدر يقدم شكوى.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!ticket.claimerId) {
      return safeReply(interaction, {
        content:
          '❌ لا يوجد موظف مستلم للتذكرة حتى الآن.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.reportedAt) {
      return safeReply(interaction, {
        content:
          '❌ تم تقديم شكوى على هذه التذكرة من قبل.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal =
      new ModalBuilder()
        .setCustomId(
          'ticket_report_modal'
        )
        .setTitle('Staff Report')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(
                'report_reason'
              )
              .setLabel(
                'اكتب سبب الشكوى'
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setMinLength(10)
              .setMaxLength(900)
              .setRequired(true)
          )
        );

    return await interaction.showModal(
      modal
    );

  } catch (error) {
    console.error(
      '[REPORT BUTTON ERROR]',
      error
    );
  }
}

// =====================================================
// STAFF REPORT SUBMIT
// =====================================================

async function handleReportSubmit(
  interaction
) {
  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const ticket =
      store.getTicketByChannelId(
        interaction.channel.id
      );

    if (!ticket) {
      return interaction.editReply({
        content:
          '❌ هذه القناة ليست تذكرة.',
      });
    }

    if (
      interaction.user.id !==
      ticket.creatorId
    ) {
      return interaction.editReply({
        content:
          '❌ فقط صاحب التذكرة يقدر يقدم شكوى.',
      });
    }

    if (!ticket.claimerId) {
      return interaction.editReply({
        content:
          '❌ لا يوجد موظف مستلم للتذكرة حتى الآن.',
      });
    }

    if (ticket.reportedAt) {
      return interaction.editReply({
        content:
          '❌ تم تقديم شكوى على هذه التذكرة من قبل.',
      });
    }

    if (
      !getLogChannel(
        interaction.guild,
        'moderation'
      )
    ) {
      return interaction.editReply({
        content:
          '❌ روم لوج الإدارة غير محدد. تواصل مع الإدارة.',
      });
    }

    const reason =
      interaction.fields
        .getTextInputValue(
          'report_reason'
        )
        .trim()
        .slice(0, 900);

    await logToGuild(
      interaction.guild,
      {
        title:
          '🚩 Staff Report — شكوى ضد موظف',

        color: COLORS.danger,

        fields: [
          {
            name:
              '👮 الموظف المشتكى عليه',
            value:
              `<@${ticket.claimerId}> (${ticket.claimerTag || ticket.claimerId})`,
            inline: true,
          },

          {
            name:
              '👤 صاحب الشكوى',
            value:
              `<@${interaction.user.id}> (${interaction.user.tag})`,
            inline: true,
          },

          {
            name: '🎫 التذكرة',
            value:
              `<#${interaction.channel.id}> — ${ticket.typeName || 'تذكرة'}`,
          },

          {
            name:
              '📝 سبب الشكوى',
            value: reason,
          },
        ],
      },
      'moderation'
    );

    store.updateTicket(
      interaction.channel.id,
      {
        reportedAt: Date.now(),
      }
    );

    return interaction.editReply({
      content:
        '✅ تم إرسال شكواك للإدارة، وسيتم مراجعتها.',
    });

  } catch (error) {
    console.error(
      '[REPORT SUBMIT ERROR]',
      error
    );

    return safeReply(interaction, {
      content:
        '❌ حصل خطأ أثناء إرسال الشكوى.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// =====================================================
// CANCEL CLOSE
// =====================================================

async function handleCancelClose(
  interaction
) {
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

      // =================================================
      // SLASH COMMANDS
      // =================================================

      if (
        interaction.isChatInputCommand()
      ) {
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

      // =================================================
      // TEMP VOICE MODALS
      // =================================================

      if (
        interaction.isModalSubmit()
      ) {

        // Temp Voice Rename / Limit
        if (
          interaction.customId ===
            'tempvoice_rename_modal' ||
          interaction.customId ===
            'tempvoice_limit_modal'
        ) {
          await tempVoice.handleModal(
            interaction
          );

          return;
        }

        // Ticket Report Modal
        if (
          interaction.customId ===
          'ticket_report_modal'
        ) {
          await handleReportSubmit(
            interaction
          );

          return;
        }

        return;
      }

      // =================================================
      // BUTTONS
      // =================================================

      if (!interaction.isButton()) {
        return;
      }

      // =================================================
      // TEMP VOICE BUTTONS
      // =================================================

      if (
        interaction.customId ===
          'tempvoice_lock' ||
        interaction.customId ===
          'tempvoice_unlock' ||
        interaction.customId ===
          'tempvoice_rename' ||
        interaction.customId ===
          'tempvoice_limit'
      ) {
        await tempVoice.handleButton(
          interaction
        );

        return;
      }

      // =================================================
      // TICKET BUTTONS
      // =================================================

      switch (
        interaction.customId
      ) {

        // -----------------------------------------------
        // TICKET TYPES
        // -----------------------------------------------

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

        // -----------------------------------------------
        // TICKET ACTIONS
        // -----------------------------------------------

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

        case 'ticket_report':
          await handleReportButton(
            interaction
          );
          break;

        // -----------------------------------------------
        // CLOSE CONFIRMATION
        // -----------------------------------------------

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

      await safeReply(
        interaction,
        {
          content:
            '❌ حصل خطأ غير متوقع.',
          flags:
            MessageFlags.Ephemeral,
        }
      );
    }
  },
};