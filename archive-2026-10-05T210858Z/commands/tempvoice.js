const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('إعداد نظام الرومات الصوتية المؤقتة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // إنشاء الكاتيجوري
      let category = interaction.guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildCategory &&
          c.name === '《═══𝐓𝐑𝐗 • 𝐕𝐎𝐈𝐂𝐄═══》'
      );

      if (!category) {
        category = await interaction.guild.channels.create({
          name: '《═══𝐓𝐑𝐗 • 𝐕𝐎𝐈𝐂𝐄═══》',
          type: ChannelType.GuildCategory,
        });
      }

      // إنشاء روم الدخول
      let joinChannel = interaction.guild.channels.cache.find(
        c =>
          c.parentId === category.id &&
          c.type === ChannelType.GuildVoice &&
          c.name === '🔊・إنشاء روم'
      );

      if (!joinChannel) {
        joinChannel = await interaction.guild.channels.create({
          name: '🔊・إنشاء روم',
          type: ChannelType.GuildVoice,
          parent: category.id,
        });
      }

      // حفظ الـ IDs في config/runtime
      config.tempVoiceCategoryId = category.id;
      config.tempVoiceChannelId = joinChannel.id;

      const embed = new EmbedBuilder()
        .setColor(0xC9A227)
        .setTitle('🎙️ نظام الرومات الصوتية المؤقتة')
        .setDescription(
          [
            'أهلًا بك في نظام الرومات الصوتية المؤقتة في **TRX**.',
            '',
            '🔊 ادخل روم **إنشاء روم** وسيتم إنشاء روم صوتي خاص بك تلقائيًا.',
            '',
            '🗑️ عند خروج آخر شخص من الروم، سيتم حذف الروم تلقائيًا.',
            '',
            '⚙️ استخدم أزرار التحكم الموجودة داخل الروم لتعديل إعداداته.',
          ].join('\n')
        )
        .setFooter({
          text: 'TRX • Temporary Voice System',
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('tempvoice_settings')
          .setLabel('إعدادات الروم')
          .setEmoji('⚙️')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('tempvoice_create')
          .setLabel('إنشاء روم')
          .setEmoji('➕')
          .setStyle(ButtonStyle.Success)
      );

      // نرسل لوحة في أقرب روم نصي متاح
      const textChannel =
        interaction.guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(interaction.guild.members.me)
              ?.has([
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
              ])
        );

      if (textChannel) {
        await textChannel.send({
          embeds: [embed],
          components: [row],
        });
      }

      await interaction.editReply({
        content:
          `✅ تم تجهيز نظام Temp Voice بنجاح.\n\n` +
          `📁 الكاتيجوري: ${category}\n` +
          `🔊 روم الإنشاء: ${joinChannel}`,
      });
    } catch (error) {
      console.error('[TEMPVOICE COMMAND ERROR]', error);

      await interaction.editReply({
        content: '❌ حصل خطأ أثناء تجهيز نظام Temp Voice.',
      });
    }
  },
};