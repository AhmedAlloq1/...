const {
  Events,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

const config = require('../utils/config');

// =====================================================
// TEMP ROOMS
// =====================================================

// channelId => ownerId
const tempRooms = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const guild = newState.guild;

      if (!guild) return;

      // =================================================
      // USER ENTERED CREATE ROOM
      // =================================================

      if (
        newState.channelId &&
        newState.channelId ===
          config.tempVoiceChannelId
      ) {
        const member =
          newState.member;

        if (!member) return;

        // -----------------------------------------------
        // CREATE PERSONAL ROOM
        // -----------------------------------------------

        const channel =
          await guild.channels.create({
            name:
              `🔊・${member.displayName}`,

            type:
              ChannelType.GuildVoice,

            parent:
              config.tempVoiceCategoryId,

            userLimit: 0,

            permissionOverwrites: [
              {
                id:
                  guild.roles.everyone.id,

                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.Speak,
                ],
              },

              {
                id:
                  member.id,

                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.Speak,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.MoveMembers,
                  PermissionsBitField.Flags.MuteMembers,
                  PermissionsBitField.Flags.DeafenMembers,
                ],
              },
            ],
          });

        // -----------------------------------------------
        // SAVE ROOM
        // -----------------------------------------------

        tempRooms.set(
          channel.id,
          member.id
        );

        // -----------------------------------------------
        // MOVE USER
        // -----------------------------------------------

        try {
          await member.voice.setChannel(
            channel
          );
        } catch (error) {
          console.error(
            '[TEMPVOICE MOVE ERROR]',
            error
          );
        }

        console.log(
          `[TEMPVOICE] Created "${channel.name}" for ${member.user.tag}`
        );

        return;
      }

      // =================================================
      // USER LEFT A TEMP ROOM
      // =================================================

      if (!oldState.channelId) {
        return;
      }

      const channel =
        oldState.guild.channels.cache.get(
          oldState.channelId
        );

      if (!channel) return;

      // =================================================
      // CHECK IF TEMP ROOM
      // =================================================

      if (
        !tempRooms.has(
          channel.id
        )
      ) {
        return;
      }

      // =================================================
      // ROOM STILL HAS MEMBERS
      // =================================================

      if (
        channel.members.size > 0
      ) {
        return;
      }

      // =================================================
      // DELETE EMPTY TEMP ROOM
      // =================================================

      const ownerId =
        tempRooms.get(
          channel.id
        );

      tempRooms.delete(
        channel.id
      );

      try {
        await channel.delete(
          `Temporary voice room closed - owner ${ownerId}`
        );

        console.log(
          `[TEMPVOICE] Deleted "${channel.name}"`
        );

      } catch (error) {
        console.error(
          '[TEMPVOICE DELETE ERROR]',
          error
        );
      }

    } catch (error) {
      console.error(
        '[TEMPVOICE ERROR]',
        error
      );
    }
  },
};