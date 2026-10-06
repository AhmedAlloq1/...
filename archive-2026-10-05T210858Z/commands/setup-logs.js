// commands/setup-logs.js — تحديد روم مخصص لكل نوع لوج يدويًا
const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
  InteractionContextType,
} = require('discord.js');
const { updateGuildSettings } = require('../utils/settingsManager');
const { COLORS, LOG_TYPE_LABELS } = require('../utils/logger');

// اسم الأوبشن في ديسكورد -> نوع اللوج
const OPTIONS = {
  'عام': ['general', 'روم اللوجات العامة'],
  'الرسائل': ['messages', 'روم لوجات حذف/تعديل الرسائل'],
  'الاعضاء': ['members', 'روم لوجات دخول/خروج الأعضاء'],
  'الادارة': ['moderation', 'روم لوجات حظر/طرد/فك حظر'],
  'السيرفر': ['server', 'روم لوجات إنشاء/حذف رومات'],
  'الرولات': ['roles', 'روم لوجات إنشاء/حذف الرولات وإضافتها/شيلها من الأعضاء'],
  'الفويس': ['voice', 'روم لوجات دخول/خروج/نقل/طرد من الفويس'],
  'التذاكر': ['tickets', 'روم لوجات فتح/قفل التذاكر'],
};

const data = new SlashCommandBuilder()
  .setName('setup-logs')
  .setDescription('تحديد روم مخصص لكل نوع لوج يدويًا')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

for (const [optName, [, desc]] of Object.entries(OPTIONS)) {
  data.addChannelOption((opt) =>
    opt.setName(optName).setDescription(desc).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );
}

module.exports = {
  data,
  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ محتاج صلاحية Manage Server.', flags: MessageFlags.Ephemeral });
    }

    const updates = {};
    for (const [optName, [logType]] of Object.entries(OPTIONS)) {
      const channel = interaction.options.getChannel(optName);
      if (channel) updates[logType] = channel.id;
    }

    if (Object.keys(updates).length === 0) {
      return interaction.reply({ content: '⚠️ لازم تحدد روم واحد على الأقل.', flags: MessageFlags.Ephemeral });
    }

    updateGuildSettings(interaction.guildId, { logs: updates });

    const lines = Object.entries(updates).map(([k, v]) => `**${LOG_TYPE_LABELS[k]}:** <#${v}>`);
    const embed = new EmbedBuilder()
      .setTitle('✅ اتظبطت رومات اللوجات')
      .setDescription(lines.join('\n'))
      .setColor(COLORS.success);
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
