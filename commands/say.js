import { SlashCommandBuilder, PermissionsBitField } from "discord.js";

export const name = "say";
export const description = "Send a message to a specified channel";

// Slash command data
export const slashCommand = new SlashCommandBuilder()
  .setName(name)
  .setDescription(description)
  .addChannelOption(option =>
    option.setName("channel")
      .setDescription("Channel to send the message to")
      .setRequired(true))
  .addStringOption(option =>
    option.setName("message")
      .setDescription("Message content")
      .setRequired(true)
  );

// Prefix command
export async function executePrefix(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ You don’t have permission to use this command.");
  }

  const channel = message.mentions.channels.first();
  if (!channel) return message.reply("❌ You must mention a channel, like `!say #general Hello!`");

  const text = args.slice(1).join(" ");
  if (!text) return message.reply("❌ You must provide a message.");

  await channel.send(text);
  await message.reply(`✅ Message sent to ${channel}`);
}

// Slash command
export async function executeSlash(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: "❌ You don’t have permission.", ephemeral: true });
  }

  const channel = interaction.options.getChannel("channel");
  const text = interaction.options.getString("message");

  await channel.send(text);
  await interaction.reply({ content: `✅ Message sent to ${channel}`, ephemeral: true });
}
