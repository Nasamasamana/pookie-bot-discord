import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [];
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`file://${path.join(commandsPath, file)}`);
  if (command.default?.data) commands.push(command.default.data);
  else if (command.data) commands.push(command.data);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  console.log('Refreshing application (/) commands.');
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}
