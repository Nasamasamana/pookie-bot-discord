import { PermissionsBitField } from "discord.js";

export const name = "unlock";
export const description = "Unlock a channel so members can send messages again";

export async function execute(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ You don’t have permission to unlock channels.");
  }

  let targetChannel = message.mentions.channels.first() || message.channel;

  try {
    await targetChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: true
    });

    message.reply(`🔓 Channel ${targetChannel} has been unlocked.`);
  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to unlock the channel.");
  }
}
