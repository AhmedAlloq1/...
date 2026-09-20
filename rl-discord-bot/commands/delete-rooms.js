const {
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { isHighestRole, checkBotPermissions } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-rooms')
    .setDescription('حذف جميع الرومات التي يستطيع البوت حذفها (يتطلب أعلى Role في السيرفر)'),

  async execute(interaction) {
    if (!isHighestRole(interaction.member)) {
      return interaction.reply({
        content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const perm = await checkBotPermissions(guild, [PermissionFlagsBits.ManageChannels]);
    if (!perm.ok) {
      return interaction.reply({
        content: `❌ البوت يفتقد الصلاحيات: ${perm.missing.join(', ')}`,
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setEmoji('✅').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setEmoji('❌').setStyle(ButtonStyle.Secondary)
    );

    const reply = await interaction.reply({
      content:
        '⚠️ هل أنت متأكد أنك تريد حذف **جميع الرومات** التي يستطيع البوت حذفها؟\nهذا الإجراء **لا يمكن التراجع عنه**.',
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    let confirmation;
    try {
      confirmation = await reply.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30000,
      });
    } catch {
      return interaction.editReply({ content: '⌛ انتهت مهلة التأكيد. تم إلغاء العملية.', components: [] });
    }

    if (confirmation.customId === 'cancel') {
      return confirmation.update({ content: '❌ تم إلغاء العملية.', components: [] });
    }

    await confirmation.update({ content: '🗑️ جاري حذف الرومات...', components: [] });

    const channels = guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildVoice ||
        c.type === ChannelType.GuildCategory ||
        c.type === ChannelType.GuildAnnouncement ||
        c.type === ChannelType.GuildForum ||
        c.type === ChannelType.GuildStageVoice
    );

    let deleted = 0;
    let failed = 0;

    for (const channel of channels.values()) {
      if (!channel.deletable) {
        failed++;
        continue;
      }
      try {
        await channel.delete('Deleted via /delete-rooms');
        deleted++;
        console.log(`[DELETE-ROOMS] Deleted channel: ${channel.name}`);
        await new Promise((res) => setTimeout(res, 400)); // مسافة بسيطة لتفادي Rate Limits
      } catch (err) {
        failed++;
        console.error(`[DELETE-ROOMS] Failed to delete ${channel.name}:`, err.message);
      }
    }

    await confirmation.editReply({
      content: `✅ تم حذف الرومات بنجاح.\nتم حذف: ${deleted} | فشل: ${failed}`,
      components: [],
    });
  },
};
