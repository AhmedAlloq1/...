// utils/config.js
// Central place that reads and validates environment variables.

require('dotenv').config({
  path: require('path').join(__dirname, '..', 'bot.env'),
});

const REQUIRED = [
  'TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
];

function requireCore() {
  const missing = REQUIRED.filter(
    (key) =>
      !process.env[key] ||
      process.env[key].trim() === ''
  );

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
  // =====================================================
  // CORE
  // =====================================================

  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  // =====================================================
  // STAFF ROLES
  // =====================================================

  staffRoleIds: parseIdList(
    process.env.STAFF_ROLE_IDS
  ),

  // =====================================================
  // TICKET
  // =====================================================

  ticketCategoryId:
    process.env.TICKET_CATEGORY_ID || null,

  ticketCategoryIds: {},

  ticketPingRoleId:
    process.env.TICKET_PING_ROLE_ID || null,

  ticketPingRoleIds: {
    support:
      process.env.TICKET_PING_ROLE_SUPPORT_ID ||
      null,

    team:
      process.env.TICKET_PING_ROLE_TEAM_ID ||
      null,

    admin:
      process.env.TICKET_PING_ROLE_ADMIN_ID ||
      null,
  },

  ticketPanelChannelId:
    process.env.TICKET_PANEL_CHANNEL_ID || null,

  ticketLogChannelId:
    process.env.TICKET_LOG_CHANNEL_ID || null,

  // =====================================================
  // TEMP VOICE
  // =====================================================

  // يتم تحديثهم تلقائيًا بواسطة أمر /tempvoice
  tempVoiceChannelId:
    process.env.TEMPVOICE_CHANNEL_ID || null,

  tempVoiceCategoryId:
    process.env.TEMPVOICE_CATEGORY_ID || null,

  tempVoiceCategoryName:
    process.env.TEMPVOICE_CATEGORY_NAME ||
    '《═══ 𝐓𝐑𝐗 • 𝐕𝐎𝐈𝐂𝐄 ═══》',

  tempVoiceLobbyName:
    process.env.TEMPVOICE_LOBBY_NAME ||
    '➕・إنشاء روم',

  // =====================================================
  // WELCOME
  // =====================================================

  welcomeChannelId:
    process.env.WELCOME_CHANNEL_ID || null,

  rulesChannelId:
    process.env.RULES_CHANNEL_ID || null,

  // =====================================================
  // AUTO ROLES
  // =====================================================

  memberRoleId:
    process.env.MEMBER_ROLE_ID || null,

  botRoleId:
    process.env.BOT_ROLE_ID || null,

  // =====================================================
  // SECURITY
  // =====================================================

  securityChannelId:
    process.env.SECURITY_CHANNEL_ID || null,

  // =====================================================
  // AI
  // =====================================================

  aiApiKey:
    process.env.AI_API_KEY || null,

  // =====================================================
  // VALIDATION
  // =====================================================

  requireCore,
};

// =====================================================
// WARNINGS
// =====================================================

if (config.staffRoleIds.length === 0) {
  console.warn(
    '[CONFIG] Warning: STAFF_ROLE_IDS is empty. ' +
    'No one will be able to use staff-only actions.'
  );
}

if (!config.ticketCategoryId) {
  console.warn(
    '[CONFIG] Warning: TICKET_CATEGORY_ID is empty.'
  );
}

if (!config.ticketPanelChannelId) {
  console.warn(
    '[CONFIG] Warning: TICKET_PANEL_CHANNEL_ID is empty.'
  );
}

if (!config.ticketLogChannelId) {
  console.warn(
    '[CONFIG] Warning: TICKET_LOG_CHANNEL_ID is empty.'
  );
}

// لا نوقف البوت لو TempVoice IDs فاضية
// لأن /tempvoice هو المسؤول عن إنشائها.

module.exports = config;