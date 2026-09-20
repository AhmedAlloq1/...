const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('match')
    .setDescription('إنشاء إعلان مباراة')
    .addStringOption((opt) =>
      opt.setName('opponent').setDescription('اسم الفريق الخصم').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('time').setDescription('موعد المباراة (مثال: اليوم 9 PM)').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('notes').setDescription('ملاحظات إضافية').setRequired(false)
    ),

  async execute(interaction) {
    const opponent = interaction.options.getString('opponent');
    const time = interaction.options.getString('time');
    const notes = interaction.options.getString('notes');

    const embed = new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('🏆 مباراة قادمة!')
      .addFields(
        { name: '⚔️ الخصم', value: opponent, inline: true },
        { name: '🕒 الموعد', value: time, inline: true }
      )
      .setFooter({ text: `أُعلن بواسطة ${interaction.user.username}` })
      .setTimestamp();

    if (notes) embed.addFields({ name: '📝 ملاحظات', value: notes });

    await interaction.reply({ content: '🚨 مباراة قادمة، استعدوا يا فريق!', embeds: [embed] });
  },
};
