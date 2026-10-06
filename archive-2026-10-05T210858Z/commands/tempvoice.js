const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('إنشاء لوحة نظام الرومات الصوتية المؤقتة')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    try {
      const guild = interaction.guild;

      // إنشاء كاتيجوري النظام
      let category = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildCategory &&
          channel.name === 'TEMP VOICE'
      );

      if (!category) {
        category = await guild.channels.create({
          name: 'TEMP VOICE',
          type: ChannelType.GuildCategory,
        });
      }

      // إنشاء روم إنشاء الرومات
      let createChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildVoice &&
          channel.name === '➕・Create Voice' &&
          channel.parentId === category.id
      );

      if (!createChannel) {
        createChannel = await guild.channels.create({
          name: '➕・Create Voice',
          type: ChannelType.GuildVoice,
          parent: category.id,
        });
      }

      // إنشاء روم لوحة التحكم
      let panelChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.name === '🎙️・voice-panel' &&
          channel.parentId === category.id
      );

      if (!panelChannel) {
        panelChannel = await guild.channels.create({
          name: '🎙️・voice-panel',
          type: ChannelType.GuildText,
          parent: category.id,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xC9A227)
        .setTitle('🎙️ Temporary Voice System')
        .setDescription(
          [
            'مرحبًا بك في نظام الرومات الصوتية المؤقتة.',
            '',
            '🎙️ **إنشاء روم**',
            'اضغط على زر إنشاء روم وسيتم إنشاء روم صوتي خاص بك.',
            '',
            '⚙️ **إعدادات الروم**',
            'بعد إنشاء الروم يمكنك التحكم فيه من خلال أزرار الإعدادات.',
            '',
            '━━━━━━━━━━━━━━━━━━',
            '',
            '🔒 قفل / فتح الروم',
            '👁️ إظهار / إخفاء الروم',
            '✏️ تغيير اسم الروم',
            '👥 تغيير عدد الأعضاء',
            '👤 إضافة عضو',
            '🚫 طرد عضو',
            '👑 نقل الملكية',
            '🗑️ حذف الروم',
            '',
            '📌 **الرومات المؤقتة تكون ظاهرة لجميع أعضاء السيرفر.**',
            'وعند خروج آخر شخص من الروم يتم حذفه تلقائيًا.',
          ].join('\n')
        )
        .setFooter({
          text: 'TRX • Temporary Voice',
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('tempvoice_create')
          .setLabel('إنشاء روم')
          .setEmoji('➕')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('tempvoice_settings')
          .setLabel('إعدادات الروم')
          .setEmoji('⚙️')
          .setStyle(ButtonStyle.Primary)
      );

      await panelChannel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content:
          `✅ تم تجهيز نظام Temp Voice بنجاح.\n\n` +
          `🎙️ روم الإنشاء: ${createChannel}\n` +
          `⚙️ لوحة التحكم: ${panelChannel}`,
        ephemeral: true,
      });

    } catch (error) {
      console.error('[TEMPVOICE COMMAND ERROR]', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ حصل خطأ أثناء إنشاء نظام Temp Voice.',
          ephemeral: true,
        });
      }
    }
  },
};
