// commands/setup-logs-create.js — إنشاء كاتيجوري ورومات اللوجات من الصفر
const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  InteractionContextType,
} = require('discord.js');
const { updateGuildSettings } = require('../utils/settingsManager');
const { COLORS, LOG_TYPE_LABELS, AUTO_CHANNEL_NAMES } = require('../utils/logger');

const CATEGORY_NAME = '📁・Logs';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs-create')
    .setDescription('إنشاء كاتيجوري ورومات اللوجات كلها من الصفر')
    .addBooleanOption((opt) =>
      opt.setName('استبدال_الموجود').setDescription('لو فيه رومات بنفس الاسم بالفعل، اعمل رومات جديدة بدالها')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '❌ محتاج صلاحية Manage Channels.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const replaceExisting = interaction.options.getBoolean('استبدال_الموجود') ?? false;

    try {
      let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME
      );
      if (!category) {
        category = await guild.channels.create({ name: CATEGORY_NAME, type: ChannelType.GuildCategory });
      }

      // نفس الروم ممكن يتستخدم لأكتر من نوع لوج (general/server بيشاركوا room-logs)
      const createdChannels = {};
      const results = {};

      for (const [logType, channelName] of Object.entries(AUTO_CHANNEL_NAMES)) {
        if (createdChannels[channelName]) {
          results[logType] = createdChannels[channelName];
          continue;
        }

        const existing = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === channelName
        );

        let channel;
        if (existing && !replaceExisting) {
          channel = existing;
        } else {
          channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
              // البوت لازم يشوف الروم ويبعت فيه، وإلا @everyone deny هيمنعه
              {
                id: interaction.client.user.id,
                type: OverwriteType.Member,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
            ],
          });
        }

        createdChannels[channelName] = channel.id;
        results[logType] = channel.id;
      }

      updateGuildSettings(interaction.guildId, { logs: results });

      const lines = Object.entries(results).map(([k, v]) => `**${LOG_TYPE_LABELS[k]}:** <#${v}>`);
      const embed = new EmbedBuilder()
        .setTitle('✅ اتعملت رومات اللوجات')
        .setDescription(lines.join('\n'))
        .setColor(COLORS.success);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[SETUP-LOGS-CREATE ERROR]', err);
      return interaction.editReply('❌ حصل خطأ وأنا بعمل الرومات. اتأكد إن البوت معاه صلاحية Manage Channels.');
    }
  },
};
