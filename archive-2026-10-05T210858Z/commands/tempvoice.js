const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription(
      'إنشاء وتجهيز نظام الرومات الصوتية المؤقتة'
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      const guild = interaction.guild;

      if (!guild) {
        return interaction.editReply({
          content:
            '❌ هذا الأمر يعمل داخل السيرفر فقط.',
        });
      }

      // =================================================
      // FIND CATEGORY
      // =================================================

      let category =
        guild.channels.cache.find(
          (channel) =>
            channel.type ===
              ChannelType.GuildCategory &&
            channel.name ===
              config.tempVoiceCategoryName
        );

      // =================================================
      // CREATE CATEGORY
      // =================================================

      if (!category) {
        category =
          await guild.channels.create({
            name:
              config.tempVoiceCategoryName,

            type:
              ChannelType.GuildCategory,

            permissionOverwrites: [
              {
                id:
                  guild.roles.everyone.id,

                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.Connect,
                ],
              },
            ],
          });

        console.log(
          `[TEMPVOICE] Category created: ${category.id}`
        );
      }

      // =================================================
      // FIND LOBBY
      // =================================================

      let lobby =
        guild.channels.cache.find(
          (channel) =>
            channel.type ===
              ChannelType.GuildVoice &&
            channel.name ===
              config.tempVoiceLobbyName &&
            channel.parentId ===
              category.id
        );

      // =================================================
      // CREATE LOBBY
      // =================================================

      if (!lobby) {
        lobby =
          await guild.channels.create({
            name:
              config.tempVoiceLobbyName,

            type:
              ChannelType.GuildVoice,

            parent:
              category.id,

            userLimit: 0,

            permissionOverwrites: [
              {
                id:
                  guild.roles.everyone.id,

                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.Connect,
                  PermissionFlagsBits.Speak,
                ],
              },
            ],
          });

        console.log(
          `[TEMPVOICE] Lobby created: ${lobby.id}`
        );
      }

      // =================================================
      // SAVE IDS IN CONFIG MEMORY
      // =================================================

      config.tempVoiceCategoryId =
        category.id;

      config.tempVoiceChannelId =
        lobby.id;

      // =================================================
      // EMBED
      // =================================================

      const embed =
        new EmbedBuilder()
          .setColor(0xC9A227)
          .setTitle(
            '《═══ 𝐓𝐑𝐗 • 𝐓𝐄𝐌𝐏 𝐕𝐎𝐈𝐂𝐄 ═══》'
          )
          .setDescription(
            [
              '🎙️ **نظام الرومات الصوتية المؤقتة**',
              '',
              'ادخل روم **➕・إنشاء روم** وسيتم إنشاء روم صوتي خاص بك تلقائيًا.',
              '',
              '━━━━━━━━━━━━━━━━━━',
              '',
              '➕ **إنشاء روم**',
              'لإنشاء روم صوتي خاص بك.',
              '',
              '⚙️ **إعدادات الروم**',
              'لإدارة الروم الخاص بك.',
              '',
              '🗑️ عندما يخرج آخر شخص من الروم، يتم حذف الروم تلقائيًا.',
            ].join('\n')
          )
          .setFooter({
            text:
              'TRX • Temporary Voice System',
          })
          .setTimestamp();

      // =================================================
      // BUTTONS
      // =================================================

      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(
              'tempvoice_create'
            )
            .setLabel('إنشاء روم')
            .setEmoji('➕')
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              'tempvoice_settings'
            )
            .setLabel('إعدادات الروم')
            .setEmoji('⚙️')
            .setStyle(
              ButtonStyle.Secondary
            )
        );

      // =================================================
      // SEND PANEL
      // =================================================

      await lobby.send({
        embeds: [embed],
        components: [row],
      });

      // =================================================
      // SUCCESS
      // =================================================

      return interaction.editReply({
        content:
          `✅ تم تجهيز نظام الـTempVoice بالكامل.\n\n` +
          `📂 الكاتيجوري: ${category}\n` +
          `🔊 روم الإنشاء: ${lobby}`,
      });

    } catch (error) {
      console.error(
        '[TEMPVOICE COMMAND ERROR]',
        error
      );

      return interaction.editReply({
        content:
          '❌ حصل خطأ أثناء إنشاء نظام الـTempVoice.\n' +
          'تأكد أن البوت عنده Manage Channels.',
      });
    }
  },
};