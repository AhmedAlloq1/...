const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');
const { sendTicketPanel } = require('../utils/tickets');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('إعادة إرسال Ticket Panel في روم التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const guild = interaction.guild;
    const channel = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.name === config.ticketChannel
    );

    if (!channel) {
      return interaction.reply({
        content: `❌ لم يتم العثور على روم التذاكر (${config.ticketChannel}). شغّل /setup أولاً.`,
        ephemeral: true,
      });
    }

    const perm = await checkBotPermissions(guild, [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ViewChannel,
    ]);
    if (!perm.ok) {
      return interaction.reply({
        content: `❌ البوت يفتقد الصلاحيات: ${perm.missing.join(', ')}`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      await sendTicketPanel(channel, { force: true });
      await interaction.editReply({ content: `✅ تم إعادة إرسال Ticket Panel في <#${channel.id}>` });
      console.log(`[TICKET-PANEL] Re-sent by ${interaction.user.tag}`);
    } catch (err) {
      console.error('[TICKET PANEL COMMAND ERROR]', err);
      await interaction.editReply({ content: `❌ فشل إرسال Panel: ${err.message}` });
    }
  },
};
