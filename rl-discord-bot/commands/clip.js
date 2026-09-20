const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clip')
    .setDescription('شجّع الأعضاء على مشاركة الـ Clips الخاصة بهم'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🔥 شارك أفضل Clips لك!')
      .setDescription(
        'صوّرت هدف جنون أو Save أسطوري؟ لا تخليه لنفسك 🚗⚽\n' +
          'شاركه في روم الـ Clips وخلي الفريق يشوف مهاراتك!'
      )
      .setFooter({ text: 'Rocket League Team' });

    await interaction.reply({ embeds: [embed] });
  },
};
