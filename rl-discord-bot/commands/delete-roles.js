const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config/config');
const { isHighestRole } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-roles')
    .setDescription('حذف الرتب المحددة في Config (يتطلب أعلى Role في السيرفر)'),

  async execute(interaction) {
    if (!isHighestRole(interaction.member)) {
      return interaction.reply({
        content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const me = guild.members.me;
    const botHighestPosition = me.roles.highest.position;

    // ⚠️ الحماية: لا @everyone، لا رتب managed (بوتات/تكاملات)،
    // لا أي رتبة أعلى من أو تساوي رتبة البوت، ولا أي رتبة البوت لا يقدر يديرها،
    // ويجب أن تكون مذكورة صراحة في config.deletableRoleNames.
    const targets = guild.roles.cache.filter((role) => {
      if (role.id === guild.id) return false;
      if (role.managed) return false;
      if (role.position >= botHighestPosition) return false;
      if (!role.editable) return false;
      return config.deletableRoleNames.includes(role.name);
    });

    if (targets.size === 0) {
      return interaction.reply({
        content:
          'ℹ️ لا توجد رتب قابلة للحذف حسب Config الحالي. أضف أسماء الرتب في `deletableRoleNames` داخل `config/config.js`.',
        ephemeral: true,
      });
    }

    const list = targets.map((r) => `• ${r.name}`).join('\n').slice(0, 3500);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setEmoji('❌').setStyle(ButtonStyle.Secondary)
    );

    const reply = await interaction.reply({
      content: `⚠️ هل أنت متأكد أنك تريد حذف الرتب التالية؟\n\n${list}`,
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

    await confirmation.update({ content: '🗑️ جاري حذف الرتب...', components: [] });

    let deleted = 0;
    let failed = 0;

    for (const role of targets.values()) {
      try {
        await role.delete('Deleted via /delete-roles');
        deleted++;
        console.log(`[DELETE-ROLES] Deleted role: ${role.name}`);
        await new Promise((res) => setTimeout(res, 400));
      } catch (err) {
        failed++;
        console.error(`[DELETE-ROLES] Failed to delete ${role.name}:`, err.message);
      }
    }

    await confirmation.editReply({
      content: `✅ تم حذف الرتب بنجاح.\nتم حذف: ${deleted} | فشل: ${failed}`,
      components: [],
    });
  },
};
