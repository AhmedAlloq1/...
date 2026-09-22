// commands/ticket-panel.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { ticketPanelEmbed, errorEmbed } = require('../utils/embeds');
const { panelActionRow } = require('../utils/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Send the ticket creation panel to this channel (Staff only).'),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('You do not have permission to use this command.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.channel.send({
        embeds: [ticketPanelEmbed()],
        components: [panelActionRow()],
      });
      await interaction.reply({
        content: '✅ Ticket panel sent.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('[COMMAND ticket-panel] Failed to send panel:', err);
      await interaction.reply({
        embeds: [errorEmbed('I was unable to send the panel here. Check my permissions.')],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
