// commands/setup-security.js — تجهيز روم الحماية من الحسابات المخترقة
const {
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  InteractionContextType,
} = require('discord.js');
const { updateGuildSettings } = require('../utils/settingsManager');
const { getSecurityChannelId } = require('../utils/security');
const { securityEmbed } = require('../utils/embeds');

const CHANNEL_NAME = '🛡️-حماية-من-الاختراق-';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-security')
    .setDescription('تجهيز روم الحماية من الحسابات المخترقة وإرسال الإمبد')
    .addChannelOption((opt) =>
      opt
        .setName('الروم')
        .setDescription('روم موجود بالفعل (سيبه فاضي لإنشاء روم جديد)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ الأمر ده للأدمن فقط.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    try {
      // الروم: اللي اختاره الأدمن، أو المحفوظ قبل كده، أو ننشئ واحد جديد
      let channel = interaction.options.getChannel('الروم');
      if (!channel) {
        const savedId = getSecurityChannelId(guild.id);
        channel = savedId ? guild.channels.cache.get(savedId) : null;
      }
      if (!channel) {
        channel = await guild.channels.create({
          name: CHANNEL_NAME,
          type: ChannelType.GuildText,
          topic: 'روم حماية من الحسابات المخترقة — ممنوع الكتابة هنا نهائياً',
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
            {
              id: interaction.client.user.id,
              type: OverwriteType.Member,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ],
        });
      }

      updateGuildSettings(guild.id, { security: { channelId: channel.id } });
      await channel.send({ embeds: [securityEmbed()] });

      // تنبيه لو البوت ناقصه صلاحيات ضرورية للحماية
      const me = guild.members.me;
      const needed = {
        ModerateMembers: 'Timeout Members (للكتم)',
        ManageMessages: 'Manage Messages (لحذف الرسائل)',
        ManageRoles: 'Manage Roles (للرول التلقائي)',
      };
      const missing = Object.entries(needed)
        .filter(([flag]) => !me.permissions.has(PermissionFlagsBits[flag]))
        .map(([, label]) => `• ${label}`);

      let reply = `✅ تم تجهيز روم الحماية: ${channel}`;
      if (missing.length) {
        reply += `\n\n⚠️ البوت ناقصه صلاحيات:\n${missing.join('\n')}`;
      }
      return interaction.editReply(reply);
    } catch (err) {
      console.error('[SETUP-SECURITY ERROR]', err);
      return interaction.editReply('❌ حصل خطأ. اتأكد إن البوت معاه صلاحية Manage Channels.');
    }
  },
};
