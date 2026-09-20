const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('training')
    .setDescription('إنشاء إعلان تدريب')
    .addStringOption((opt) =>
      opt.setName('time').setDescription('موعد التدريب (مثال: غدًا 8 PM)').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('focus').setDescription('محور التدريب (مثال: Aerials, Rotation)').setRequired(false)
    ),

  async execute(interaction) {
    const time = interaction.options.getString('time');
    const focus = interaction.options.getString('focus');

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🗓️ جلسة تدريب جديدة')
      .addFields({ name: '🕒 الموعد', value: time, inline: true })
      .setFooter({ text: `أُعلن بواسطة ${interaction.user.username}` })
      .setTimestamp();

    if (focus) embed.addFields({ name: '🎯 المحور', value: focus, inline: true });
    embed.setDescription('خلونا نطوّر مستوانا مع بعض 💪🚗');

    await interaction.reply({ embeds: [embed] });
  },
};
