const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = 'YOUR_BOT_TOKEN';
const clientId = 'YOUR_CLIENT_ID';
const guildId = 'YOUR_TEST_GUILD_ID'; // For testing

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data) commands.push(command.data);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Refreshing application (/) commands.');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
