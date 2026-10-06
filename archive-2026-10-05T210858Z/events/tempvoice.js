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
} = require('discord.js');

const tempRooms = new Map();

/*
  tempRooms:
  channelId -> {
    ownerId,
    guildId
  }
*/

// =====================================================
// CREATE TEMP VOICE
// =====================================================

async function createTempVoice(interaction) {
  try {
    const guild = interaction.guild;
    const member = interaction.member;

    // لو العضو داخل روم بالفعل
    if (!member.voice.channel) {
      return interaction.reply({
        content: '❌ لازم تدخل روم صوتي أولاً قبل إنشاء الروم.',
        flags: 64,
      });
    }

    // منع إنشاء أكثر من روم
    for (const [channelId, data] of tempRooms) {
      if (
        data.guildId === guild.id &&
        data.ownerId === member.id
      ) {
        const oldChannel = guild.channels.cache.get(channelId);

        if (oldChannel) {
          return interaction.reply({
            content: `❌ عندك روم مؤقت بالفعل: ${oldChannel}`,
            flags: 64,
          });
        }

        tempRooms.delete(channelId);
      }
    }

    // إنشاء الروم
    const channel = await guild.channels.create({
      name: `🎙️・${member.user.username}`,
      type: ChannelType.GuildVoice,

      // ظاهر للكل
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

    tempRooms.set(channel.id, {
      ownerId: member.id,
      guildId: guild.id,
    });

    // نقل العضو للروم
    try {
      await member.voice.setChannel(channel);
    } catch (error) {
      console.error('[TEMPVOICE MOVE ERROR]', error);

      // لو فشل النقل نحذف الروم عشان ما يفضلش روم فاضي
      try {
        await channel.delete('Failed to move member');
      } catch {}

      tempRooms.delete(channel.id);

      return interaction.reply({
        content: '❌ لم أستطع نقلك إلى الروم الصوتي.',
        flags: 64,
      });
    }

    return interaction.reply({
      content: `✅ تم إنشاء رومك: ${channel}`,
      flags: 64,
    });

  } catch (error) {
    console.error('[TEMPVOICE CREATE ERROR]', error);

    if (!interaction.replied) {
      return interaction.reply({
        content: '❌ حدث خطأ أثناء إنشاء الروم.',
        flags: 64,
      });
    }
  }
}

// =====================================================
// SETTINGS
// =====================================================

async function tempVoiceSettings(interaction) {
  try {
    let room = null;

    for (const [channelId, data] of tempRooms) {
      if (
        data.guildId === interaction.guild.id &&
        data.ownerId === interaction.user.id
      ) {
        room = interaction.guild.channels.cache.get(channelId);
        break;
      }
    }

    if (!room) {
      return interaction.reply({
        content: '❌ أنت لا تملك روم مؤقت حاليًا.',
        flags: 64,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xC9A227)
      .setTitle('⚙️ إعدادات الروم')
      .setDescription(
        [
          `🎙️ **الروم:** ${room}`,
          '',
          'استخدم الأزرار بالأسفل للتحكم في الروم.',
        ].join('\n')
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tempvoice_rename')
        .setLabel('تغيير الاسم')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('tempvoice_limit')
        .setLabel('تغيير العدد')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('tempvoice_delete')
        .setLabel('حذف الروم')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64,
    });

  } catch (error) {
    console.error('[TEMPVOICE SETTINGS ERROR]', error);
  }
}

// =====================================================
// RENAME MODAL
// =====================================================

async function renameRoom(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tempvoice_rename_modal')
    .setTitle('تغيير اسم الروم');

  const input = new TextInputBuilder()
    .setCustomId('tempvoice_name')
    .setLabel('اسم الروم الجديد')
    .setPlaceholder('مثال: غرفة أحمد')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return interaction.showModal(modal);
}

// =====================================================
// LIMIT MODAL
// =====================================================

async function limitRoom(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tempvoice_limit_modal')
    .setTitle('تغيير عدد الأعضاء');

  const input = new TextInputBuilder()
    .setCustomId('tempvoice_limit_value')
    .setLabel('عدد الأعضاء')
    .setPlaceholder('0 = بدون حد')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return interaction.showModal(modal);
}

// =====================================================
// GET OWNER ROOM
// =====================================================

function getOwnerRoom(guild, userId) {
  for (const [channelId, data] of tempRooms) {
    if (
      data.guildId === guild.id &&
      data.ownerId === userId
    ) {
      const channel = guild.channels.cache.get(channelId);

      if (channel) {
        return channel;
      }

      tempRooms.delete(channelId);
    }
  }

  return null;
}

// =====================================================
// VOICE STATE
// =====================================================

async function handleVoiceStateUpdate(oldState, newState) {
  try {
    // =================================================
    // أولًا: لو العضو خرج من روم مؤقت
    // =================================================

    if (oldState.channelId) {
      const oldChannel = oldState.channel;

      if (oldChannel && tempRooms.has(oldChannel.id)) {

        // انتظر لحظة عشان Discord يحدث قائمة الأعضاء
        setTimeout(async () => {
          try {
            const channel = oldState.guild.channels.cache.get(
              oldChannel.id
            );

            if (!channel) {
              tempRooms.delete(oldChannel.id);
              return;
            }

            // =================================================
            // لو مفيش أي حد في الروم → احذفه
            // =================================================

            if (channel.members.size === 0) {
              console.log(
                `[TEMPVOICE] Deleting empty room: ${channel.name}`
              );

              await channel.delete(
                'Temporary voice room became empty'
              );

              tempRooms.delete(channel.id);
            }

          } catch (error) {
            console.error(
              '[TEMPVOICE AUTO DELETE ERROR]',
              error
            );

            // لو الروم اتحذف بالفعل
            if (
              error.code === 10003 ||
              error.code === 10004
            ) {
              tempRooms.delete(oldChannel.id);
            }
          }
        }, 1000);
      }
    }

  } catch (error) {
    console.error(
      '[TEMPVOICE VOICE STATE ERROR]',
      error
    );
  }
}

// =====================================================
// INTERACTION CREATE
// =====================================================

async function handleInteraction(interaction) {
  try {
    if (interaction.isButton()) {

      switch (interaction.customId) {

        case 'tempvoice_create':
          return createTempVoice(interaction);

        case 'tempvoice_settings':
          return tempVoiceSettings(interaction);

        case 'tempvoice_rename':
          return renameRoom(interaction);

        case 'tempvoice_limit':
          return limitRoom(interaction);

        case 'tempvoice_delete': {
          const room = getOwnerRoom(
            interaction.guild,
            interaction.user.id
          );

          if (!room) {
            return interaction.reply({
              content: '❌ أنت لا تملك روم مؤقت حاليًا.',
              flags: 64,
            });
          }

          await room.delete('Owner requested deletion');

          tempRooms.delete(room.id);

          return interaction.reply({
            content: '🗑️ تم حذف الروم بنجاح.',
            flags: 64,
          });
        }
      }
    }

    // =================================================
    // RENAME MODAL
    // =================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'tempvoice_rename_modal'
    ) {
      const room = getOwnerRoom(
        interaction.guild,
        interaction.user.id
      );

      if (!room) {
        return interaction.reply({
          content: '❌ الروم غير موجود.',
          flags: 64,
        });
      }

      const name = interaction.fields
        .getTextInputValue('tempvoice_name')
        .trim();

      if (!name) {
        return interaction.reply({
          content: '❌ اسم غير صالح.',
          flags: 64,
        });
      }

      await room.setName(`🎙️・${name}`);

      return interaction.reply({
        content: '✅ تم تغيير اسم الروم.',
        flags: 64,
      });
    }

    // =================================================
    // LIMIT MODAL
    // =================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'tempvoice_limit_modal'
    ) {
      const room = getOwnerRoom(
        interaction.guild,
        interaction.user.id
      );

      if (!room) {
        return interaction.reply({
          content: '❌ الروم غير موجود.',
          flags: 64,
        });
      }

      const value = Number(
        interaction.fields.getTextInputValue(
          'tempvoice_limit_value'
        )
      );

      if (
        !Number.isInteger(value) ||
        value < 0 ||
        value > 99
      ) {
        return interaction.reply({
          content: '❌ اكتب رقم من 0 إلى 99.',
          flags: 64,
        });
      }

      await room.setUserLimit(value);

      return interaction.reply({
        content:
          value === 0
            ? '✅ تم إلغاء حد الأعضاء.'
            : `✅ تم تحديد الروم إلى ${value} عضو.`,
        flags: 64,
      });
    }

  } catch (error) {
    console.error(
      '[TEMPVOICE INTERACTION ERROR]',
      error
    );
  }
}

// =====================================================
// EXPORT
// =====================================================

module.exports = [
  {
    name: Events.InteractionCreate,
    execute: handleInteraction,
  },

  {
    name: Events.VoiceStateUpdate,
    execute: handleVoiceStateUpdate,
  },
];