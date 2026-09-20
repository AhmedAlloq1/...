require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ TOKEN و CLIENT_ID مطلوبان في ملف .env');
  process.exit(1);
}

const isGlobal = process.argv.includes('--global');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    if (isGlobal) {
      console.log(`⏳ تسجيل ${commands.length} أمر Global...`);
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ تم تسجيل الأوامر Global بنجاح (قد تستغرق حتى ساعة للظهور في كل السيرفرات).');
    } else {
      if (!GUILD_ID) {
        console.error('❌ GUILD_ID مطلوب للتسجيل على سيرفر محدد. أضفه في .env أو استخدم "node deploy-commands.js --global".');
        process.exit(1);
      }
      console.log(`⏳ تسجيل ${commands.length} أمر على السيرفر ${GUILD_ID}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ تم تسجيل الأوامر بنجاح (تظهر فورًا في هذا السيرفر).');
    }
  } catch (err) {
    console.error('❌ فشل تسجيل الأوامر:', err);
    process.exit(1);
  }
})();
