const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('إعداد نظام الرومات الصوتية المؤقتة')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xC9A227)
      .setTitle('🎙️ نظام الرومات الصوتية المؤقتة')
      .setDescription(
        [
          'مرحبًا بك في نظام الرومات الصوتية المؤقتة.',
          '',
          'يمكنك من خلال الأزرار بالأسفل إنشاء روم صوتي مؤقت وإدارته.',
          '',
          '🎙️ **إنشاء روم**',
          'ينشئ لك روم صوتي خاص بك وتنتقل إليه تلقائيًا.',
          '',
          '⚙️ **إعدادات الروم**',
          'تتيح لك التحكم في اسم الروم وعدد الأعضاء وبعض إعداداته.',
          '',
          '🗑️ **الحذف التلقائي**',
          'عندما يخرج آخر شخص من الروم، يتم حذف الروم تلقائيًا.',
        ].join('\n')
      )
      .setFooter({
        text: 'TRX • Temporary Voice System',
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tempvoice_create')
        .setLabel('إنشاء روم')
        .setEmoji('🎙️')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('tempvoice_settings')
        .setLabel('إعدادات الروم')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: '✅ تم إرسال لوحة الرومات المؤقتة.',
      flags: 64,
    });
  },
};