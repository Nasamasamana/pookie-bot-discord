import { getDraft } from '../utils/drafts.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'announcepreview', // prefix: p!announcepreview
  description: 'Preview your announcement',
  run: async (client, message, args) => {
    const draft = getDraft(message.author.id);
    if (!draft) return message.reply('No draft found. Use p!announcecreate first.');

    const embed = new EmbedBuilder()
      .setTitle(draft.title || '')
      .setDescription(draft.description || '')
      .setColor(draft.color || '#0099ff')
      .setFooter({ text: draft.footer || '' })
      .setImage(draft.image || null)
      .setThumbnail(draft.thumbnail || null);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dismiss_preview')
        .setLabel('Dismiss')
        .setStyle(ButtonStyle.Secondary)
    );

    const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = sentMessage.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'dismiss_preview' && i.user.id === message.author.id) {
        await sentMessage.delete().catch(() => {});
      }
    });
  }
};
