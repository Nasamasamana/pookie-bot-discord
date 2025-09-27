const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN; // Use your Render environment variable
const clientId = process.env.CLIENT_ID; 
const guildId = process.env.GUILD_ID; // A test server you control

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
