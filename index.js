import express from "express";
import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = "!";

// ---------- Simple web server for keep-alive ----------
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive");
});

// Optional health endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", bot: client.user ? client.user.tag : "starting" });
});

// Use Render's port or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});
// -----------------------------------------------------

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "say") {
    // Only Administrators may use this
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don’t have permission to use this command.");
    }

    // Get first mentioned channel
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply("❌ You must mention a channel, like `!say #general Hello!`");
    }

    // Remove the first arg (the channel mention) from args and join the rest
    // When a channel is mentioned, the mention is the first token, so slice(1)
    const text = args.slice(1).join(" ");
    if (!text) {
      return message.reply("❌ You must provide a message.");
    }

    try {
      await channel.send(text);
      await message.reply(`✅ Message sent to ${channel}`);
    } catch (err) {
      console.error("Send error:", err);
      await message.reply("❌ Failed to send the message.");
    }
  }
});

// login using environment variable
client.login(process.env.DISCORD_BOT_TOKEN);
