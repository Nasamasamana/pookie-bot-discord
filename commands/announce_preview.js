// commands/announce_preview.js
const { getDraft } = require('../utils/drafts');
const announceHandler = require('../interactions/announceHandler');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'announce_preview',
  async execute({ message, client }) {
    if (!client.__announceHandlerAttached) {
      client.on('interactionCreate', async (interaction) => {
        try { await announceHandler(interaction, client); } catch (e) { console.error(e); }
      });
      client.__announceHandlerAttached = true;
    }

    const userId = message.author.id;
    const draft = getDraft(userId);
    if (!draft) return message.reply('No draft found. Create one with p!announce_create');

    const embed = announceHandler.buildAnnouncementEmbed(draft);

    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`announce_editbuilder_${userId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`announce_confirmbtn_${userId}`).setLabel('✅ Confirm & Send').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`announce_cancelpreview_${userId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
      )
    ];

    // try DM first
    try {
      const user = await client.users.fetch(userId);
      await user.send({ content: 'Preview of your announcement:', embeds: [embed], components: rows });
      return message.reply('Preview sent to your DMs.');
    } catch (err) {
      // fallback to channel
      await message.channel.send({ content: `${message.author}`, embeds: [embed], components: rows }).catch(() => {});
      return message.reply('Could not DM you — preview posted in channel.');
    }
  }
};
