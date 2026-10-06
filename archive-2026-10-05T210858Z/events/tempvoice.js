const {
  Events,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const TEMP_CATEGORY_NAME = 'TEMP VOICE';
const CREATE_CHANNEL_NAME = '➕・Create Voice';

const tempRooms = new Map();

function getUserRoom(userId) {
  return tempRooms.get(userId);
}

function getRoomByChannel(channelId) {
  for (const [ownerId, data] of tempRooms.entries()) {
    if (data.channelId === channelId) {
      return {
        ownerId,
        ...data,
      };
    }
  }

  return null;
}

function controlButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tv_lock')
      .setLabel('قفل')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('tv_hide')
      .setLabel('إخفاء')
      .setEmoji('👁️')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('tv_name')
      .setLabel('تغيير الاسم')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('tv_limit')
      .setLabel('عدد الأعضاء')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Primary)
  );
}

function extraButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tv_add')
      .setLabel('إضافة عضو')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('tv_kick')
      .setLabel('طرد عضو')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('tv_transfer')
      .setLabel('نقل الملكية')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('tv_delete')
      .setLabel('حذف الروم')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );
}

async function createTempRoom(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  const existing = getUserRoom(user.id);

  if (existing) {
    const oldChannel = guild.channels.cache.get(existing.channelId);

    if (oldChannel) {
      return interaction.reply({
        content: `❌ عندك روم بالفعل: ${oldChannel}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    tempRooms.delete(user.id);
  }

  const category = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === TEMP_CATEGORY_NAME
  );

  if (!category) {
    return interaction.reply({
      content: '❌ كاتيجوري TEMP VOICE غير موجودة.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = await guild.channels.create({
    name: `🔊・${user.username}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    userLimit: 0,

    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
        ],
      },
    ],
  });

  tempRooms.set(user.id, {
    channelId: channel.id,
    ownerId: user.id,
  });

  await interaction.member.voice.setChannel(channel);

  await interaction.reply({
    content: `✅ تم إنشاء رومك: ${channel}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function checkOwner(interaction) {
  const room = getRoomByChannel(interaction.channel.id);

  if (!room) {
    await interaction.reply({
      content: '❌ هذه القناة ليست روم مؤقت.',
      flags: MessageFlags.Ephemeral,
    });

    return null;
  }

  if (room.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ فقط صاحب الروم يقدر يستخدم هذه الإعدادات.',
      flags: MessageFlags.Ephemeral,
    });

    return null;
  }

  return room;
}

async function showSettings(interaction) {
  const room = getUserRoom(interaction.user.id);

  if (!room) {
    return interaction.reply({
      content: '❌ أنت لا تملك روم صوتي مؤقت حاليًا.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.guild.channels.cache.get(room.channelId);

  if (!channel) {
    tempRooms.delete(interaction.user.id);

    return interaction.reply({
      content: '❌ الروم لم يعد موجودًا.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xC9A227)
    .setTitle('⚙️ إعدادات الروم')
    .setDescription(
      [
        `🎙️ **الروم:** ${channel}`,
        `👑 **المالك:** <@${interaction.user.id}>`,
        '',
        'استخدم الأزرار بالأسفل للتحكم في رومك.',
      ].join('\n')
    );

  return interaction.reply({
    embeds: [embed],
    components: [
      controlButtons(),
      extraButtons(),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function openNameModal(interaction) {
  const room = await checkOwner(interaction);
  if (!room) return;

  const modal = new ModalBuilder()
    .setCustomId('tv_name_modal')
    .setTitle('تغيير اسم الروم');

  const input = new TextInputBuilder()
    .setCustomId('tv_name_input')
    .setLabel('اسم الروم الجديد')
    .setPlaceholder('اكتب اسم الروم...')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  await interaction.showModal(modal);
}

async function openLimitModal(interaction) {
  const room = await checkOwner(interaction);
  if (!room) return;

  const modal = new ModalBuilder()
    .setCustomId('tv_limit_modal')
    .setTitle('تغيير عدد الأعضاء');

  const input = new TextInputBuilder()
    .setCustomId('tv_limit_input')
    .setLabel('عدد الأعضاء من 0 إلى 99')
    .setPlaceholder('0 = بدون حد')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  await interaction.showModal(modal);
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      // ================================
      // BUTTONS
      // ================================

      if (interaction.isButton()) {

        if (interaction.customId === 'tempvoice_create') {
          return createTempRoom(interaction);
        }

        if (interaction.customId === 'tempvoice_settings') {
          return showSettings(interaction);
        }

        if (interaction.customId === 'tv_name') {
          return openNameModal(interaction);
        }

        if (interaction.customId === 'tv_limit') {
          return openLimitModal(interaction);
        }

        if (interaction.customId === 'tv_lock') {
          const room = await checkOwner(interaction);
          if (!room) return;

          const channel = interaction.guild.channels.cache.get(
            room.channelId
          );

          const everyone = interaction.guild.roles.everyone;

          const overwrite =
            channel.permissionOverwrites.cache.get(everyone.id);

          const isLocked =
            overwrite?.deny.has(
              PermissionsBitField.Flags.Connect
            );

          await channel.permissionOverwrites.edit(
            everyone,
            {
              Connect: isLocked ? true : false,
            }
          );

          return interaction.reply({
            content: isLocked
              ? '🔓 تم فتح الروم للجميع.'
              : '🔒 تم قفل الروم.',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (interaction.customId === 'tv_hide') {
          const room = await checkOwner(interaction);
          if (!room) return;

          const channel = interaction.guild.channels.cache.get(
            room.channelId
          );

          const everyone = interaction.guild.roles.everyone;

          const overwrite =
            channel.permissionOverwrites.cache.get(everyone.id);

          const isHidden =
            overwrite?.deny.has(
              PermissionsBitField.Flags.ViewChannel
            );

          await channel.permissionOverwrites.edit(
            everyone,
            {
              ViewChannel: isHidden ? true : false,
            }
          );

          return interaction.reply({
            content: isHidden
              ? '👁️ تم إظهار الروم للجميع.'
              : '🙈 تم إخفاء الروم.',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (interaction.customId === 'tv_delete') {
          const room = await checkOwner(interaction);
          if (!room) return;

          const channel = interaction.guild.channels.cache.get(
            room.channelId
          );

          tempRooms.delete(room.ownerId);

          if (channel) {
            await channel.delete('Temporary voice deleted by owner');
          }

          return interaction.reply({
            content: '🗑️ تم حذف الروم.',
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // ================================
      // MODALS
      // ================================

      if (interaction.isModalSubmit()) {

        if (interaction.customId === 'tv_name_modal') {
          const room = await checkOwner(interaction);
          if (!room) return;

          const channel = interaction.guild.channels.cache.get(
            room.channelId
          );

          const name = interaction.fields
            .getTextInputValue('tv_name_input')
            .trim();

          if (!name) {
            return interaction.reply({
              content: '❌ اكتب اسمًا صحيحًا.',
              flags: MessageFlags.Ephemeral,
            });
          }

          await channel.setName(`🔊・${name}`);

          return interaction.reply({
            content: `✅ تم تغيير اسم الروم إلى **${name}**.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (interaction.customId === 'tv_limit_modal') {
          const room = await checkOwner(interaction);
          if (!room) return;

          const channel = interaction.guild.channels.cache.get(
            room.channelId
          );

          const value = Number(
            interaction.fields.getTextInputValue(
              'tv_limit_input'
            )
          );

          if (
            !Number.isInteger(value) ||
            value < 0 ||
            value > 99
          ) {
            return interaction.reply({
              content: '❌ العدد يجب أن يكون بين 0 و99.',
              flags: MessageFlags.Ephemeral,
            });
          }

          await channel.setUserLimit(value);

          return interaction.reply({
            content:
              value === 0
                ? '✅ تم إزالة حد الأعضاء.'
                : `✅ تم تحديد الروم بـ **${value}** أعضاء.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // ================================
      // VOICE STATES
      // ================================

    } catch (error) {
      console.error('[TEMPVOICE ERROR]', error);

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content: '❌ حصل خطأ غير متوقع.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};