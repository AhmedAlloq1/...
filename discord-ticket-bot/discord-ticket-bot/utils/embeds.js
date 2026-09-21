// utils/embeds.js
const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  neutral: 0x2b2d31,
};

function ticketPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎫 Support Center')
    .setDescription(
      'Need help?\nCreate a ticket and our Staff team will assist you as soon as possible.'
    )
    .setFooter({ text: 'Click the button below to open a ticket' });
}

function ticketCreatedEmbed(userId) {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎫 Ticket Created')
    .setDescription(
      `Welcome <@${userId}>!\n\nPlease explain your issue and a Staff member will assist you shortly.`
    );
}

function ticketClaimedEmbed(staffId) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🎫 Ticket Claimed')
    .setDescription(`This ticket has been claimed by <@${staffId}>.`);
}

function closeRequestEmbed(userId) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🔒 Ticket Close Request')
    .setDescription(
      `<@${userId}>\n\nA Staff member has requested to close this ticket.\nDo you want to close it?`
    );
}

function welcomeEmbed(userId) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('👋 Welcome!')
    .setDescription(
      `Welcome <@${userId}>!\n\nWelcome to the server!\nEnjoy your stay and make yourself at home. ❤️`
    );
}

function errorEmbed(message) {
  return new EmbedBuilder().setColor(COLORS.danger).setDescription(`❌ ${message}`);
}

function successEmbed(message) {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${message}`);
}

function ticketLogEmbed(ticket, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle('📁 Ticket Log')
    .addFields(
      { name: 'Ticket', value: extra.channelName || ticket.channelId, inline: true },
      { name: 'Creator', value: `<@${ticket.creatorId}>`, inline: true },
      { name: 'Claimed By', value: ticket.claimerId ? `<@${ticket.claimerId}>` : 'Not claimed', inline: true },
      { name: 'Closed By', value: ticket.closedById ? `<@${ticket.closedById}>` : 'Unknown', inline: true },
      { name: 'Created At', value: ticket.createdAt ? `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:F>` : 'Unknown', inline: true },
      { name: 'Closed At', value: ticket.closedAt ? `<t:${Math.floor(new Date(ticket.closedAt).getTime() / 1000)}:F>` : 'Unknown', inline: true }
    )
    .setTimestamp();
  return embed;
}

module.exports = {
  COLORS,
  ticketPanelEmbed,
  ticketCreatedEmbed,
  ticketClaimedEmbed,
  closeRequestEmbed,
  welcomeEmbed,
  errorEmbed,
  successEmbed,
  ticketLogEmbed,
};
