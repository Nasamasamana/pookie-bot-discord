import express from "express";
import {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const prefix = "!";
client.prefixCommands = new Collection();
client.slashCommands = [];

// Load all commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.prefixCommands.set(command.name, command);
  if (command.slashCommand) {
    client.slashCommands.push(command.slashCommand.toJSON());
  }
}

// ---------- Web server ----------
const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server on ${PORT}`));
// ---------------------------------

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash commands (guild-based for fast update; change to global if you want)
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: client.slashCommands }
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("Slash register error:", err);
  }
});

// Prefix handler
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName);
  if (!command) return;

  try {
    await command.executePrefix(message, args);
  } catch (err) {
    console.error(err);
    message.reply("❌ Error executing prefix command.");
  }
});

// Slash handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.prefixCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.executeSlash(interaction);
  } catch (err) {
    console.error(err);
    interaction.reply({ content: "❌ Error executing slash command.", ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
