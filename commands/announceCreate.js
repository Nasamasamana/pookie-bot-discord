import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { saveDraft, getDraft } from '../utils/drafts.js';

export default {
  name: 'announcecreate', // prefix: p!announcecreate
  description: 'Create a new announcement',
  run: async (client, message, args) => {
    const draft = getDraft(message.author.id) || {
      title: '',
      description: '',
      color: '#0099ff',
      footer: '',
      image: '',
      thumbnail: '',
      channelId: message.channel.id
    };
    saveDraft(message.author.id, draft);

    // Create a simple modal to fill title (you can add more inputs)
    const modal = new ModalBuilder()
      .setCustomId('announce_modal')
      .setTitle('Create Announcement')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your title')
            .setValue(draft.title)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter the description')
            .setValue(draft.description)
        )
      );

    await message.showModal(modal);
  }
};
