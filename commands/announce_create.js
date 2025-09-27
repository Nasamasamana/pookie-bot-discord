// commands/announce_create.js
const { getDraft, saveDraft } = require('../utils/drafts');
const announceHandler = require('../interactions/announceHandler');

module.exports = {
  name: 'announce_create',
  async execute({ message, client }) {
    // ensure the interaction handler is attached (if not already)
    if (!client.__announceHandlerAttached) {
      client.on('interactionCreate', async (interaction) => {
        try { await announceHandler(interaction, client); } catch (e) { console.error(e); }
      });
      client.__announceHandlerAttached = true;
    }

    const userId = message.author.id;
    const draft = getDraft(userId);

    // build embed + components via helper from interactions file
    const embed = announceHandler.buildBuilderEmbed(draft, message.author);
    const components = announceHandler.buildBuilderComponents(userId, draft);

    const sent = await message.channel.send({ embeds: [embed], components }).catch(err => {
      console.error('Failed to send builder message', err);
      return null;
    });
    if (!sent) return message.reply('Failed to create builder message. Check bot permissions.');

    draft.builderMessage = { channelId: message.channel.id, messageId: sent.id };
    saveDraft(userId, draft);

    return message.reply('Announcement builder created. Use the buttons to toggle/edit fields. When ready press ✅ Done.');
  }
};
