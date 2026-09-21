// deploy-commands.js
// Registers all slash commands from /commands to a single guild
// (GUILD_ID) so they show up instantly during development, instead
// of the up-to-an-hour delay of global command registration.

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./utils/config');

config.requireCore();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command?.data) {
    console.warn(`[DEPLOY] Skipping ${file}: missing "data" export.`);
    continue;
  }
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`[DEPLOY] Registering ${commands.length} slash command(s) to guild ${config.guildId}...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log(`[DEPLOY] Successfully registered ${data.length} command(s).`);
  } catch (err) {
    console.error('[DEPLOY] Failed to register commands:', err);
    process.exit(1);
  }
})();
