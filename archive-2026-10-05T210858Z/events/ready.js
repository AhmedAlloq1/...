// events/ready.js
const { Events } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[READY] Logged in as ${client.user.tag}`);
    console.log(`[READY] Serving guild: ${config.guildId}`);
    // بدون نشاط (مفيش "Playing ..." تحت اسم البوت)
    client.user.setPresence({
      activities: [],
      status: 'online',
    });
    console.log('[READY] Presence cleared (no activity).');
  },
};
