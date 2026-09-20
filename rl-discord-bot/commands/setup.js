const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config/config');
const { isHighestRole, checkBotPermissions } = require('../utils/permissions');
const { sendTicketPanel } = require('../utils/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('إنشاء/التحقق من هيكل السيرفر بالكامل (يتطلب أعلى Role في السيرفر)'),

  async execute(interaction) {
    if (!isHighestRole(interaction.member)) {
      return interaction.reply({
        content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const perm = await checkBotPermissions(guild, [
      PermissionFlagsBits.ManageChannels,
    ]);
    if (!perm.ok) {
      return interaction.reply({
        content: `❌ البوت يفتقد الصلاحيات التالية: ${perm.missing.join(', ')}`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const log = [];

    try {
      // ---- Categories + Text Channels ----
      for (const key of Object.keys(config.categories)) {
        if (key === 'voice') continue; // نتعامل معها لاحقًا كـ Voice

        const catName = config.categories[key];
        let category = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildCategory && c.name === catName
        );

        if (!category) {
          category = await guild.channels.create({ name: catName, type: ChannelType.GuildCategory });
          log.push(`✅ تم إنشاء Category: ${catName}`);
          console.log(`[SETUP] Category created: ${catName}`);
        } else {
          log.push(`↪️ Category موجودة: ${catName}`);
          console.log(`[SETUP] Category already exists: ${catName}`);
        }

        for (const chName of config.channels[key] || []) {
          let channel = guild.channels.cache.find(
            (c) => c.type === ChannelType.GuildText && c.name === chName
          );

          if (!channel) {
            channel = await guild.channels.create({
              name: chName,
              type: ChannelType.GuildText,
              parent: category.id,
            });
            log.push(`✅ تم إنشاء الروم: ${chName}`);
            console.log(`[SETUP] Channel created: ${chName}`);
          } else {
            if (channel.parentId !== category.id) {
              await channel.setParent(category.id).catch(() => {});
            }
            log.push(`↪️ الروم موجود: ${chName}`);
            console.log(`[SETUP] Channel already exists: ${chName}`);
          }
        }
      }

      // ---- Voice Category + Channels ----
      const voiceCatName = config.categories.voice;
      let voiceCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === voiceCatName
      );
      if (!voiceCategory) {
        voiceCategory = await guild.channels.create({ name: voiceCatName, type: ChannelType.GuildCategory });
        log.push(`✅ تم إنشاء Category: ${voiceCatName}`);
        console.log(`[SETUP] Category created: ${voiceCatName}`);
      } else {
        log.push(`↪️ Category موجودة: ${voiceCatName}`);
        console.log(`[SETUP] Category already exists: ${voiceCatName}`);
      }

      for (const vcName of config.voiceChannels) {
        let vc = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildVoice && c.name === vcName
        );
        if (!vc) {
          await guild.channels.create({
            name: vcName,
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id,
          });
          log.push(`✅ تم إنشاء Voice Channel: ${vcName}`);
          console.log(`[SETUP] Voice channel created: ${vcName}`);
        } else {
          if (vc.parentId !== voiceCategory.id) {
            await vc.setParent(voiceCategory.id).catch(() => {});
          }
          log.push(`↪️ Voice Channel موجود: ${vcName}`);
          console.log(`[SETUP] Voice channel already exists: ${vcName}`);
        }
      }

      // ---- Ticket Panel (idempotent) ----
      const ticketChannel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === config.ticketChannel
      );
      if (ticketChannel) {
        await sendTicketPanel(ticketChannel);
      }

      const summary = log.join('\n').slice(0, 3900);
      await interaction.editReply({ content: `**تم تشغيل /setup بنجاح ✅**\n\n${summary}` });
    } catch (err) {
      console.error('[SETUP ERROR]', err);
      await interaction.editReply({ content: `❌ حدث خطأ أثناء التنفيذ: ${err.message}` });
    }
  },
};
