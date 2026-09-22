// commands/close.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { isStaff } = require('../utils/permissions');
const {
  errorEmbed,
  closeRequestEmbed,
} = require('../utils/embeds');

const {
  closeTicket,
  closeRequestActionRow,
} = require('../utils/ticketManager');

const { logTicketClose } = require('../utils/ticketLogger');
const store = require('../utils/dataStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close ticket commands')

    .addSubcommand((sub) =>
      sub
        .setName('request')
        .setDescription(
          'Ask the ticket owner to confirm closing (Staff only)'
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName('ticket')
        .setDescription(
          'Immediately close the current ticket (Staff only)'
        )
    ),

  async execute(interaction) {
    // Staff only
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'You do not have permission to use this command.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = store.getTicketByChannel(
      interaction.channel.id
    );

    if (!ticket) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'This command can only be used inside a ticket.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status !== 'open') {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'This ticket is already closed.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    // =========================
    // /close request
    // =========================
    if (sub === 'request') {
      await interaction.reply({
        embeds: [
          closeRequestEmbed(ticket.creatorId),
        ],
        components: [
          closeRequestActionRow(),
        ],
      });

      return;
    }

    // =========================
    // /close ticket
    // =========================

    const channel = interaction.channel;

    const result = await closeTicket(
      channel,
      interaction.user
    );

    if (result.error) {
      return interaction.reply({
        embeds: [
          errorEmbed(result.error),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // تسجيل التذكرة قبل حذف القناة
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

    await interaction.reply({
      content:
        `🔒 تم إغلاق التذكرة بواسطة <@${interaction.user.id}>.\n` +
        `🗑️ سيتم حذف القناة خلال لحظات...`,
    });

    // حذف القناة بعد إعطاء Discord فرصة لمعالجة الرسالة
    setTimeout(async () => {
      try {
        await channel.delete(
          'Ticket closed'
        );
      } catch (error) {
        console.error(
          '[TICKET DELETE ERROR]',
          error
        );
      }
    }, 1500);
  },
};