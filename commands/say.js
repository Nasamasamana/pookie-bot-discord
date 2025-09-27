import { PermissionsBitField } from "discord.js";

export const name = "say";
export const description = "Send a message to a specified channel";

export async function execute(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ You don’t have permission to use this command.");
  }

  const channel = message.mentions.channels.first();
  if (!channel) {
    return message.reply("❌ You must mention a channel, like `p!say #general Hello!`");
  }

  const text = args.slice(1).join(" ");
  if (!text) return message.reply("❌ You must provide a message.");

  try {
    await channel.send(text);
    await message.reply(`✅ Message sent to ${channel}`);
  } catch (err) {
    console.error("Send error:", err);
    await message.reply("❌ Failed to send the message.");
  }
}
