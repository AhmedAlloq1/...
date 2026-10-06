// commands/rename.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { renameTicket } = require('../utils/ticketManager');
const store = require('../utils/dataStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Ticket management commands')
    .addSubcommand((sub) =>
      sub
        .setName('ticket')
        .setDescription('Rename the current ticket channel (Staff only)')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('New name for the ticket').setRequired(true)
        )
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

    const name = interaction.options.getString('name', true);
    const result = await renameTicket(interaction.channel, name);

    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({
      embeds: [successEmbed(`Ticket renamed to \`${result.newName}\`.`)],
    });
  },
};
