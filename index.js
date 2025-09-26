import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = "!";

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "say") {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply("❌ You must mention a channel, like `!say #general hello`");
    }

    const text = args.slice(1).join(" ");
    if (!text) {
      return message.reply("❌ You must provide a message.");
    }

    try {
      await channel.send(text);
      await message.reply(`✅ Message sent to ${channel}`);
    } catch (err) {
      console.error(err);
      await message.reply("❌ Failed to send the message.");
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
