// commands/announceConfirm.js
const { getDraft, deleteDraft } = require('../utils/drafts');
const announceHandler = require('../interactions/announceHandler');

module.exports = {
  name: 'announceConfirm',
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
      if (!draft) return message.reply('No draft to confirm. Create with p!announceCreate');
      if (!draft.channelId) return message.reply('No target channel selected. Set channel in the builder first.');

      const ch = await message.client.channels.fetch(draft.channelId).catch(() => null);
      if (!ch || !ch.isTextBased()) return message.reply('Target channel unreachable or not a text channel.');

      const embed = announceHandler.buildAnnouncementEmbed(draft);
      await ch.send({ embeds: [embed] });
      deleteDraft(userId);
      return message.reply(`Announcement posted to <#${draft.channelId}>`);
    } catch (err) {
      console.error('announceConfirm error', err);
      return message.reply('Failed to post announcement (permissions?).');
    }
  }
};
