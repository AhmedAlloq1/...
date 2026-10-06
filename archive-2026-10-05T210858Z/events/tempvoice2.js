const {
  Events,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const config = require('../utils/config');

// الرومات المؤقتة الموجودة حاليًا
const tempChannels = new Set();

// =====================================================
// إنشاء روم مؤقت
// =====================================================

async function createTempVoice(member) {
  const guild = member.guild;

  const categoryId = config.tempVoiceCategoryId;
  const createChannelId = config.tempVoiceChannelId;

  if (!categoryId || !createChannelId) return null;

  if (member.voice.channelId !== createChannelId) {
    return null;
  }

  const category = guild.channels.cache.get(categoryId);

  if (!category) return null;

  const channel = await guild.channels.create({
    name: `🎙️・${member.user.username}`,
    type: ChannelType.GuildVoice,
    parent: category.id,

    userLimit: 0,

    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ViewChannel,
        ],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
        ],
      },
    ],
  });

  tempChannels.add(channel.id);

  // ننقل العضو للروم الجديد
  try {
    await member.voice.setChannel(channel);
  } catch (error) {
    console.error('[TEMPVOICE MOVE ERROR]', error);
  }

  // لوحة التحكم
  const embed = new EmbedBuilder()
    .setColor(0xC9A227)
    .setTitle('🎙️ التحكم في الروم الصوتي')
    .setDescription(
      [
        `مرحبًا <@${member.id}> 👋`,
        '',
        'هذا الروم تم إنشاؤه لك تلقائيًا.',
        '',
        '⚙️ يمكنك التحكم في الروم من الأزرار بالأسفل.',
        '',
        '🔒 **قفل الروم**',
        'يمنع الأعضاء من الدخول.',
        '',
        '🔓 **فتح الروم**',
        'يسمح للأعضاء بالدخول مرة أخرى.',
        '',
        '✏️ **تغيير الاسم**',
        'تغيير اسم الروم.',
        '',
        '👥 **تغيير العدد**',
        'تحديد الحد الأقصى للأعضاء.',
      ].join('\n')
    )
    .setFooter({
      text: 'TRX • Temporary Voice',
    })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tempvoice_lock')
      .setLabel('قفل')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('tempvoice_unlock')
      .setLabel('فتح')
      .setEmoji('🔓')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('tempvoice_rename')
      .setLabel('تغيير الاسم')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('tempvoice_limit')
      .setLabel('العدد')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds: [embed],
    components: [row1],
  });

  return channel;
}

// =====================================================
// حذف الروم إذا أصبح فارغًا
// =====================================================

async function deleteIfEmpty(channel) {
  if (!channel) return;

  if (!tempChannels.has(channel.id)) return;

  if (channel.members.size > 0) return;

  try {
    await channel.delete('Temporary voice channel is empty');
    tempChannels.delete(channel.id);

    console.log(
      `[TEMPVOICE] Deleted empty channel: ${channel.name}`
    );
  } catch (error) {
    console.error(
      '[TEMPVOICE DELETE ERROR]',
      error
    );
  }
}

// =====================================================
// هل المستخدم صاحب الروم؟
// =====================================================

function isOwner(channel, userId) {
  const member = channel.members.get(userId);

  if (!member) return false;

  // أول شخص في الروم يعتبر المالك
  const owner = channel.members.first();

  return owner?.id === userId;
}

// =====================================================
// Interaction Buttons
// =====================================================

async function handleButton(interaction) {
  const channel = interaction.member.voice?.channel;

  if (!channel) {
    return interaction.reply({
      content: '❌ لازم تكون داخل رومك الصوتي أولًا.',
      ephemeral: true,
    });
  }

  if (!tempChannels.has(channel.id)) {
    return interaction.reply({
      content: '❌ هذا ليس رومًا مؤقتًا.',
      ephemeral: true,
    });
  }

  if (!isOwner(channel, interaction.user.id)) {
    return interaction.reply({
      content: '❌ أنت لست صاحب هذا الروم.',
      ephemeral: true,
    });
  }

  // ================================
  // LOCK
  // ================================

  if (interaction.customId === 'tempvoice_lock') {
    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      {
        Connect: false,
      }
    );

    return interaction.reply({
      content: '🔒 تم قفل الروم.',
      ephemeral: true,
    });
  }

  // ================================
  // UNLOCK
  // ================================

  if (interaction.customId === 'tempvoice_unlock') {
    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      {
        Connect: true,
      }
    );

    return interaction.reply({
      content: '🔓 تم فتح الروم.',
      ephemeral: true,
    });
  }

  // ================================
  // RENAME
  // ================================

  if (interaction.customId === 'tempvoice_rename') {
    const modal = new ModalBuilder()
      .setCustomId('tempvoice_rename_modal')
      .setTitle('تغيير اسم الروم');

    const input = new TextInputBuilder()
      .setCustomId('tempvoice_name')
      .setLabel('اسم الروم الجديد')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(50)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }

  // ================================
  // LIMIT
  // ================================

  if (interaction.customId === 'tempvoice_limit') {
    const modal = new ModalBuilder()
      .setCustomId('tempvoice_limit_modal')
      .setTitle('تحديد عدد الأعضاء');

    const input = new TextInputBuilder()
      .setCustomId('tempvoice_limit_value')
      .setLabel('العدد من 0 إلى 99')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(2)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }
}

// =====================================================
// Modal
// =====================================================

async function handleModal(interaction) {
  const channel = interaction.member.voice?.channel;

  if (!channel || !tempChannels.has(channel.id)) {
    return interaction.reply({
      content: '❌ أنت لست داخل روم مؤقت.',
      ephemeral: true,
    });
  }

  if (!isOwner(channel, interaction.user.id)) {
    return interaction.reply({
      content: '❌ أنت لست صاحب هذا الروم.',
      ephemeral: true,
    });
  }

  // تغيير الاسم
  if (interaction.customId === 'tempvoice_rename_modal') {
    const name = interaction.fields
      .getTextInputValue('tempvoice_name')
      .trim();

    if (!name) {
      return interaction.reply({
        content: '❌ الاسم غير صالح.',
        ephemeral: true,
      });
    }

    await channel.setName(`🎙️・${name}`);

    return interaction.reply({
      content: `✅ تم تغيير اسم الروم إلى **${name}**.`,
      ephemeral: true,
    });
  }

  // تغيير العدد
  if (interaction.customId === 'tempvoice_limit_modal') {
    const value = Number(
      interaction.fields.getTextInputValue(
        'tempvoice_limit_value'
      )
    );

    if (
      Number.isNaN(value) ||
      value < 0 ||
      value > 99
    ) {
      return interaction.reply({
        content: '❌ اكتب رقمًا من 0 إلى 99.',
        ephemeral: true,
      });
    }

    await channel.setUserLimit(value);

    return interaction.reply({
      content:
        value === 0
          ? '✅ تم إلغاء الحد الأقصى للأعضاء.'
          : `✅ تم تحديد الروم على **${value}** أعضاء.`,
      ephemeral: true,
    });
  }
}

// =====================================================
// EVENT
// =====================================================

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      // دخول روم الإنشاء
      if (
        newState.channelId &&
        newState.channelId === config.tempVoiceChannelId
      ) {
        await createTempVoice(newState.member);
      }

      // خرج من روم مؤقت
      if (
        oldState.channelId &&
        tempChannels.has(oldState.channelId)
      ) {
        await deleteIfEmpty(oldState.channel);
      }
    } catch (error) {
      console.error(
        '[TEMPVOICE EVENT ERROR]',
        error
      );
    }
  },

  handleButton,
  handleModal,
};