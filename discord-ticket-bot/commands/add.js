// commands/add.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { addUserToTicket } = require('../utils/ticketManager');
const store = require('../utils/dataStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the current ticket (Staff only)')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to add to this ticket').setRequired(true)
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

    const target = interaction.options.getUser('user', true);
    const result = await addUserToTicket(interaction.channel, target);

    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({
      embeds: [successEmbed(`<@${target.id}> has been added to this ticket.`)],
    });
  },
};
