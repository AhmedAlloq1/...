// utils/config.js
// Central place that reads and validates environment variables.
// The bot should never crash mid-operation because of a missing
// *optional* variable, but a handful of core variables are required
// just to log in and register commands at all.

require('dotenv').config();

const REQUIRED = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];

function requireCore() {
  const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    console.error(
      `[CONFIG] Missing required environment variable(s): ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill these in before starting the bot.'
    );
    process.exit(1);
  }
}

function parseIdList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

const config = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  staffRoleIds: parseIdList(process.env.STAFF_ROLE_IDS),

  ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
  ticketPanelChannelId: process.env.TICKET_PANEL_CHANNEL_ID || null,
  ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,

  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || null,

  aiApiKey: process.env.AI_API_KEY || null,

  requireCore,
};

if (config.staffRoleIds.length === 0) {
  console.warn('[CONFIG] Warning: STAFF_ROLE_IDS is empty. No one will be able to use staff-only actions.');
}

module.exports = config;
