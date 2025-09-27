import { getDraft, saveDraft } from '../utils/drafts.js';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default {
  name: 'announceedit', // prefix: p!announceedit
  description: 'Edit your current announcement draft',
  run: async (client, message, args) => {
    const draft = getDraft(message.author.id);
    if (!draft) return message.reply('No draft found. Use p!announcecreate first.');

    const modal = new ModalBuilder()
      .setCustomId('announce_modal')
      .setTitle('Edit Announcement')
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
        // You can add more inputs here: color, footer, image, thumbnail
      );

    await message.showModal(modal);
  }
};
