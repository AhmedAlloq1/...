// utils/dataStore.js
// Minimal JSON file storage so ticket state survives a restart.
// Not meant to scale to a huge server, but enough for a first version.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tickets.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ tickets: {} }, null, 2)
    );
  }
}

function load() {
  try {
    ensureFile();

    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed.tickets) {
      parsed.tickets = {};
    }

    return parsed;
  } catch (err) {
    console.error(
      '[DATASTORE] Failed to read tickets.json, starting with empty state:',
      err
    );

    return { tickets: {} };
  }
}

function save(data) {
  try {
    ensureFile();

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.error(
      '[DATASTORE] Failed to save tickets.json:',
      err
    );
  }
}

// In-memory cache, backed by the file.
let state = load();

function getAllTickets() {
  return state.tickets;
}

function getTicketByChannel(channelId) {
  return state.tickets[channelId] || null;
}

// Alias used by ticketManager.js and interactionCreate.js
function getTicketByChannelId(channelId) {
  return getTicketByChannel(channelId);
}

function getOpenTicketByUser(userId) {
  return (
    Object.values(state.tickets).find(
      (t) =>
        t.creatorId === userId &&
        t.status === 'open'
    ) || null
  );
}

function createTicket(channelId, ticketData) {
  state.tickets[channelId] = {
    channelId,
    status: 'open',
    claimerId: null,
    addedUserIds: [],
    createdAt: new Date().toISOString(),
    closedAt: null,
    closedById: null,
    ...ticketData,
  };

  save(state);

  return state.tickets[channelId];
}

function updateTicket(channelId, updates) {
  if (!state.tickets[channelId]) {
    return null;
  }

  state.tickets[channelId] = {
    ...state.tickets[channelId],
    ...updates,
  };

  save(state);

  return state.tickets[channelId];
}

function deleteTicket(channelId) {
  delete state.tickets[channelId];

  save(state);
}

module.exports = {
  getAllTickets,

  // Original function
  getTicketByChannel,

  // Alias for compatibility
  getTicketByChannelId,

  getOpenTicketByUser,
  createTicket,
  updateTicket,
  deleteTicket,
};