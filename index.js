require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// When bot is ready
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Command: !say <message>
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Only trigger on !say
  if (message.content.startsWith("!say ")) {
    const text = message.content.slice(5).trim();

    if (!text) {
      return message.reply("⚠️ You need to provide a message!");
    }

    // Change this to your target channel ID
    const targetChannelId = process.env.TARGET_CHANNEL_ID;
    const channel = message.guild.channels.cache.get(targetChannelId);

    if (!channel) {
      return message.reply("❌ Target channel not found!");
    }

    channel.send(text);
    message.reply("✅ Sent your message!");
  }
});

client.login(process.env.DISCORD_TOKEN);
