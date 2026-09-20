const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('عرض أعضاء التيم'),

  async execute(interaction) {
    const guild = interaction.guild;
    const role = guild.roles.cache.find((r) => r.name === config.rosterRole);

    if (!role) {
      return interaction.reply({
        content: `❌ لم يتم العثور على رتبة \`${config.rosterRole}\`. عدّل \`rosterRole\` في config/config.js.`,
        ephemeral: true,
      });
    }

    await guild.members.fetch().catch(() => {});
    const members = role.members;

    if (members.size === 0) {
      return interaction.reply({
        content: `ℹ️ لا يوجد أعضاء حاليًا في رتبة \`${role.name}\`.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle(`👥 Team Roster — ${guild.name}`)
      .setDescription(members.map((m) => `🚗 ${m}`).join('\n').slice(0, 4000))
      .setFooter({ text: `${members.size} عضو` });

    await interaction.reply({ embeds: [embed] });
  },
};
