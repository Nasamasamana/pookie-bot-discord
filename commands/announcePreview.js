// commands/announcePreview.js
const announceHandler = require('../interactions/announceHandler');
const { getDraft } = require('../utils/drafts');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'announcePreview',
  async execute({ message, client }) {
    try {
      if (!client.__announceHandlerAttached) {
        client.on('interactionCreate', async (interaction) => {
          try { await announceHandler(interaction, client); } catch (e) { console.error(e); }
        });
        client.__announceHandlerAttached = true;
      }

      const userId = message.author.id;
      const draft = getDraft(userId);
      if (!draft) return message.reply('No draft found. Create one with p!announceCreate');

      const embed = announceHandler.buildAnnouncementEmbed(draft);
      const rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`announce_editbuilder_${userId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`announce_confirmbtn_${userId}`).setLabel('✅ Confirm & Send').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`announce_cancelpreview_${userId}`).setLabel('Dismiss').setStyle(ButtonStyle.Danger)
        )
      ];

      // Send preview in the channel (prefix commands cannot send ephemeral messages).
      const previewMsg = await message.channel.send({ content: `${message.author}`, embeds: [embed], components: rows }).catch(err => {
        console.error('failed to send preview', err);
        return null;
      });
      if (!previewMsg) return message.reply('Failed to post preview.');

      // auto-delete the preview after 5 minutes to reduce clutter (unless dismissed earlier)
      setTimeout(() => {
        previewMsg.delete().catch(() => {});
      }, 5 * 60 * 1000);

      return message.reply('Preview posted in channel. Use the buttons on the preview to Edit, Confirm, or Dismiss (Dismiss deletes the preview).');
    } catch (err) {
      console.error('announcePreview error', err);
      return message.reply('Internal error while previewing.');
    }
  }
};
