// commands/announceCreate.js
const announceHandler = require('../interactions/announceHandler');
const { getDraft, saveDraft } = require('../utils/drafts');

module.exports = {
  name: 'announceCreate',
  async execute({ message, client }) {
    try {
      // attach interaction handler if not already
      if (!client.__announceHandlerAttached) {
        client.on('interactionCreate', async (interaction) => {
          try { await announceHandler(interaction, client); } catch (e) { console.error(e); }
        });
        client.__announceHandlerAttached = true;
      }

      const userId = message.author.id;
      const draft = getDraft(userId);

      const embed = announceHandler.buildBuilderEmbed(draft, message.author);
      const components = announceHandler.buildBuilderComponents(userId, draft);

      const sent = await message.channel.send({ embeds: [embed], components }).catch(err => {
        console.error('Failed to send builder message', err);
        return null;
      });
      if (!sent) return message.reply('Failed to create builder message. Check bot permissions.');

      draft.builderMessage = { channelId: message.channel.id, messageId: sent.id };
      saveDraft(userId, draft);

      return message.reply('Announcement builder created. Use the buttons in the builder message to edit/toggle fields. When ready press ✅ Done.');
    } catch (err) {
      console.error('announceCreate error', err);
      return message.reply('Internal error creating builder.');
    }
  }
};
