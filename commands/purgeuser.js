import { PermissionsBitField } from "discord.js";

export const name = "purgeuser";
export const description = "Delete recent messages from a specific user across all channels";

export async function execute(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ You don’t have permission to use this command.");
  }

  const target = message.mentions.users.first();
  if (!target) return message.reply("❌ Mention a user, like `p!purgeuser @username`");

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
