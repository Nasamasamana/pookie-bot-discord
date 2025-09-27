import { PermissionsBitField } from "discord.js";

export const name = "lock";
export const description = "Lock a channel to prevent members from sending messages";

export async function execute(message, args) {
  // Check for ManageChannels permission
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ You don’t have permission to lock channels.");
  }

  // Determine target channel
  let targetChannel = message.mentions.channels.first() || message.channel;

  try {
    await targetChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false
    });

    message.reply(`🔒 Channel ${targetChannel} has been locked.`);
  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to lock the channel.");
  }
}
