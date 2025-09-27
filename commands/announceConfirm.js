import { getDraft, deleteDraft } from '../utils/drafts.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'announceconfirm', // prefix: p!announceconfirm
  description: 'Send the announcement to the selected channel',
  run: async (client, message, args) => {
    const draft = getDraft(message.author.id);
    if (!draft) return message.reply('No draft found. Use p!announcecreate first.');

    const channel = message.guild.channels.cache.get(draft.channelId);
    if (!channel) return message.reply('Channel not found.');

    const embed = new EmbedBuilder()
      .setTitle(draft.title || '')
      .setDescription(draft.description || '')
      .setColor(draft.color || '#0099ff')
      .setFooter({ text: draft.footer || '' })
      .setImage(draft.image || null)
      .setThumbnail(draft.thumbnail || null);

    await channel.send({ embeds: [embed] });
    deleteDraft(message.author.id);
    message.reply('Announcement sent!');
  }
};
