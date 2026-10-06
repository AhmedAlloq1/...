// commands/setup-logs-auto.js — البحث التلقائي عن رومات لوجات موجودة وربطها
const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
  InteractionContextType,
} = require('discord.js');
const { updateGuildSettings } = require('../utils/settingsManager');
const { COLORS, LOG_TYPE_LABELS, AUTO_CHANNEL_NAMES } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs-auto')
    .setDescription('البحث التلقائي عن رومات لوجات موجودة بالفعل وربطها')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ محتاج صلاحية Manage Server.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const found = {};
    for (const [logType, channelName] of Object.entries(AUTO_CHANNEL_NAMES)) {
      const channel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === channelName
      );
      if (channel) found[logType] = channel.id;
    }

    if (Object.keys(found).length === 0) {
      return interaction.editReply(
        '⚠️ مفيش رومات بالأسماء المتوقعة اتلاقت. استخدم `/setup-logs` يدويًا أو `/setup-logs-create`.'
      );
    }

    updateGuildSettings(interaction.guildId, { logs: found });

    const lines = Object.entries(found).map(([k, v]) => `**${LOG_TYPE_LABELS[k]}:** <#${v}>`);
    const embed = new EmbedBuilder()
      .setTitle('✅ اترتبطت الرومات تلقائيًا')
      .setDescription(lines.join('\n'))
      .setColor(COLORS.success);
    return interaction.editReply({ embeds: [embed] });
  },
};
