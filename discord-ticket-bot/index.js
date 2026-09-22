// index.js
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./utils/config');

config.requireCore();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Required for welcome messages.
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for mention/reply chat.
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

// ---- Load slash commands ----
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.existsSync(commandsPath)
  ? fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))
  : [];

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if (!command?.data || !command?.execute) {
      console.warn(`[COMMANDS] Skipping ${file}: missing "data" or "execute" export.`);
      continue;
    }
    client.commands.set(command.data.name, command);
  } catch (err) {
    console.error(`[COMMANDS] Failed to load ${file}:`, err);
  }
}

// ---- Load events ----
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.existsSync(eventsPath)
  ? fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'))
  : [];

for (const file of eventFiles) {
  try {
    const event = require(path.join(eventsPath, file));
    if (!event?.name || !event?.execute) {
      console.warn(`[EVENTS] Skipping ${file}: missing "name" or "execute" export.`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  } catch (err) {
    console.error(`[EVENTS] Failed to load ${file}:`, err);
  }
}

// ---- Global safety nets ----
// A bad command or a rejected promise anywhere should never take the whole bot down.
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

client.login(config.token).catch((err) => {
  console.error('[LOGIN] Failed to log in. Check that TOKEN is correct:', err);
  process.exit(1);
});
