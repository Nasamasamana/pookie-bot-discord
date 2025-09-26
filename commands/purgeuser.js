import { SlashCommandBuilder, PermissionsBitField } from "discord.js";

export const name = "purgeuser";
export const description = "Delete recent messages from a specific user across all channels";

// Slash command data
export const slashCommand = new SlashCommandBuilder()
  .setName(name)
  .setDescription(description)
  .addUserOption(option =>
    option.setName("target")
      .setDescription("User whose messages you want to delete")
      .setRequired(true)
  );

// Prefix command
export async function executePrefix(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ You don’t have permission to use this command.");
  }

  const target = message.mentions.users.first();
  if (!target) return message.reply("❌ Mention a user, like `!purgeuser @username`");

  let deletedCount = 0;

  for (const [id, channel] of message.guild.channels.cache) {
    if (!channel.isTextBased()) continue;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(m => m.author.id === target.id);

      for (const msg of userMessages.values()) {
        await msg.delete().catch(() => {});
        deletedCount++;
      }
    } catch (err) {
      console.error(`Failed in #${channel.name}:`, err.message);
    }
  }

  return message.reply(`✅ Deleted **${deletedCount}** messages from ${target.tag}`);
}

// Slash command
export async function executeSlash(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: "❌ You don’t have permission.", ephemeral: true });
  }

  const target = interaction.options.getUser("target");
  let deletedCount = 0;

  for (const [id, channel] of interaction.guild.channels.cache) {
    if (!channel.isTextBased()) continue;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(m => m.author.id === target.id);

      for (const msg of userMessages.values()) {
        await msg.delete().catch(() => {});
        deletedCount++;
      }
    } catch (err) {
      console.error(`Failed in #${channel.name}:`, err.message);
    }
  }

  return interaction.reply({
    content: `✅ Deleted **${deletedCount}** messages from ${target.tag}`,
    ephemeral: true
  });
}
