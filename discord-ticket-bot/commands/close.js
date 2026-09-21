// commands/close.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { errorEmbed } = require('../utils/embeds');
const { closeRequestEmbed } = require('../utils/embeds');
const { closeTicket, closeRequestActionRow } = require('../utils/ticketManager');
const { logTicketClose } = require('../utils/ticketLogger');
const store = require('../utils/dataStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close ticket commands')
    .addSubcommand((sub) =>
      sub.setName('request').setDescription('Ask the ticket owner to confirm closing (Staff only)')
    )
    .addSubcommand((sub) =>
      sub.setName('ticket').setDescription('Immediately close the current ticket (Staff only)')
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('You do not have permission to use this command.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = store.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('This command can only be used inside a ticket.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({
        embeds: [errorEmbed('This ticket is already closed.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'request') {
      await interaction.reply({
        embeds: [closeRequestEmbed(ticket.creatorId)],
        components: [closeRequestActionRow()],
      });
      return;
    }

    // sub === 'ticket' -> immediate close
    const result = await closeTicket(interaction.channel, interaction.user);
    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: `🔒 Ticket closed by <@${interaction.user.id}>.` });
    await logTicketClose(interaction.guild, interaction.channel, result.ticket);
  },
};
