const {
  Events,
} = require('discord.js');

const {
  checkRoom,
} = require('../utils/tempVoice');

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      // لو العضو خرج من روم
      if (
        oldState.channelId &&
        oldState.channelId !== newState.channelId
      ) {
        await checkRoom(
          oldState.channel
        );
      }
    } catch (error) {
      console.error(
        '[TEMPVOICE VOICE UPDATE ERROR]',
        error
      );
    }
  },
};