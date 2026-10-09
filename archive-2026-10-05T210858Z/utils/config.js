
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', 'bot.env'),
});

const REQUIRED = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];

function requireCore() {
  const missing = REQUIRED.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    console.error(
      `[CONFIG] Missing required environment variables: ${missing.join(', ')}`
    );
    process.exit(1);
  }
}

function parseIdList(value) {
  if (!value) return [];

  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

const config = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  staffRoleIds: parseIdList(process.env.STAFF_ROLE_IDS),

  // Ticket settings
  ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
  ticketPanelChannelId: process.env.TICKET_PANEL_CHANNEL_ID || null,
  ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
  ticketPingRoleId: process.env.TICKET_PING_ROLE_ID || null,

  // Other settings
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || null,
  aiApiKey: process.env.AI_API_KEY || null,

  requireCore,
};

if (config.staffRoleIds.length === 0) {
  console.warn(
    '[CONFIG] STAFF_ROLE_IDS is empty. Staff-only actions may not work.'
  );
}

if (!config.ticketCategoryId) {
  console.warn(
    '[CONFIG] TICKET_CATEGORY_ID is missing. Ticket creation will not work.'
  );
}

module.exports = config;
