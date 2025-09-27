// interactions/announceHandler.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

const { getDraft, saveDraft, deleteDraft } = require('../utils/drafts');

// Build the builder-summary embed shown in the builder message
function buildBuilderEmbed(draft, user) {
  const embed = new EmbedBuilder()
    .setTitle('Announcement Builder')
    .setDescription(`Editing announcement for ${user.tag}`)
    .setTimestamp();

  embed.addFields({ name: 'Title', value: draft.toggles.title ? (draft.title || '*empty*') : '*disabled*' });
  embed.addFields({ name: 'Description', value: draft.toggles.description ? (draft.description || '*empty*') : '*disabled*' });
  embed.addFields({ name: 'Target Channel', value: draft.channelId ? `<#${draft.channelId}>` : '*not set*' });
  embed.addFields({ name: 'Color', value: draft.color ? `#${draft.color.toString(16).padStart(6, '0')}` : '*default*' });
  embed.addFields({ name: 'Footer', value: draft.toggles.footer ? (draft.footer || '*empty*') : '*disabled*' });
  embed.addFields({ name: 'Image', value: draft.toggles.image ? (draft.image || '*empty*') : '*disabled*' });
  embed.addFields({ name: 'Thumbnail', value: draft.toggles.thumbnail ? (draft.thumbnail || '*empty*') : '*disabled*' });

  return embed;
}

// Build the action rows used in the builder
function buildBuilderComponents(userId, draft) {
  const rows = [];

  // Row 1: title/desc
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_toggle_title_${userId}`).setLabel(`Title: ${draft.toggles.title ? 'ON' : 'OFF'}`).setStyle(draft.toggles.title ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_title_${userId}`).setLabel('Edit Title').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.title),
    new ButtonBuilder().setCustomId(`announce_toggle_description_${userId}`).setLabel(`Desc: ${draft.toggles.description ? 'ON' : 'OFF'}`).setStyle(draft.toggles.description ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_description_${userId}`).setLabel('Edit Desc').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.description)
  ));

  // Row 2: set channel / color selection / custom color / done
  const colorOptions = [
    new StringSelectMenuOptionBuilder().setLabel('Default').setValue('none'),
    new StringSelectMenuOptionBuilder().setLabel('Blue').setValue('#3498db'),
    new StringSelectMenuOptionBuilder().setLabel('Green').setValue('#2ecc71'),
    new StringSelectMenuOptionBuilder().setLabel('Yellow').setValue('#f1c40f'),
    new StringSelectMenuOptionBuilder().setLabel('Red').setValue('#e74c3c'),
    new StringSelectMenuOptionBuilder().setLabel('Purple').setValue('#9b59b6')
  ];

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_setchannel_${userId}`).setLabel('Set Channel').setStyle(ButtonStyle.Primary),
    new StringSelectMenuBuilder().setCustomId(`announce_color_select_${userId}`).setPlaceholder('Pick color (preset)').addOptions(colorOptions),
    new ButtonBuilder().setCustomId(`announce_customcolor_${userId}`).setLabel('Custom Color').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_done_${userId}`).setLabel('✅ Done').setStyle(ButtonStyle.Success)
  ));

  // Row 3: footer / image
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_toggle_footer_${userId}`).setLabel(`Footer: ${draft.toggles.footer ? 'ON' : 'OFF'}`).setStyle(draft.toggles.footer ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_footer_${userId}`).setLabel('Edit Footer').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.footer),
    new ButtonBuilder().setCustomId(`announce_toggle_image_${userId}`).setLabel(`Image: ${draft.toggles.image ? 'ON' : 'OFF'}`).setStyle(draft.toggles.image ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_image_${userId}`).setLabel('Edit Image URL').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.image)
  ));

  // Row 4: thumbnail / cancel
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_toggle_thumbnail_${userId}`).setLabel(`Thumb: ${draft.toggles.thumbnail ? 'ON' : 'OFF'}`).setStyle(draft.toggles.thumbnail ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_thumbnail_${userId}`).setLabel('Edit Thumbnail URL').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.thumbnail),
    new ButtonBuilder().setCustomId(`announce_cancel_${userId}`).setLabel('Cancel / Delete Draft').setStyle(ButtonStyle.Danger)
  ));

  return rows;
}

// Build final announcement embed
function buildAnnouncementEmbed(draft) {
  const e = new EmbedBuilder();
  if (draft.toggles.title && draft.title) e.setTitle(draft.title);
  if (draft.toggles.description && draft.description) e.setDescription(draft.description);
  if (draft.color) e.setColor(draft.color);
  if (draft.toggles.footer && draft.footer) e.setFooter({ text: draft.footer });
  if (draft.toggles.image && draft.image) e.setImage(draft.image);
  if (draft.toggles.thumbnail && draft.thumbnail) e.setThumbnail(draft.thumbnail);
  e.setTimestamp();
  return e;
}

// Update the builder message in-place (if bot still has access)
async function updateBuilderMessage(client, userId, draft) {
  try {
    if (!draft.builderMessage) return;
    const { channelId, messageId } = draft.builderMessage;
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (!ch) return;
    const msg = await ch.messages.fetch(messageId).catch(() => null);
    if (!msg) return;
    const embed = buildBuilderEmbed(draft, await client.users.fetch(userId));
    const rows = buildBuilderComponents(userId, draft);
    await msg.edit({ embeds: [embed], components: rows }).catch(() => {});
  } catch (err) {
    console.error('Failed to update builder message: ', err);
  }
}

// MAIN handler for interactions (buttons/modals/selects)
async function announceHandler(interaction, client) {
  try {
    // interested in customId pattern starting with 'announce_'
    const isButton = interaction.isButton && interaction.isButton();
    const isModal = interaction.isModalSubmit && interaction.isModalSubmit();
    const isSelect = interaction.isStringSelectMenu && interaction.isStringSelectMenu();

    if (!isButton && !isModal && !isSelect) return;
    const customId = interaction.customId;
    if (!customId || !customId.startsWith('announce_')) return;

    const parts = customId.split('_');
    const lastPart = parts[parts.length - 1];
    const targetUserId = lastPart;

    // only the owner may use these controls
    if (interaction.user.id !== targetUserId) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `This control belongs to <@${targetUserId}>.`, ephemeral: true }).catch(() => {});
      } else {
        await interaction.followUp({ content: `This control belongs to <@${targetUserId}>.`, ephemeral: true }).catch(() => {});
      }
      return;
    }

    const draft = getDraft(targetUserId);

    // BUTTON HANDLERS
    if (isButton) {
      await interaction.deferUpdate().catch(() => {});
      // Toggle fields
      if (customId.startsWith('announce_toggle_')) {
        const field = parts[2];
        if (field && draft.toggles.hasOwnProperty(field)) {
          draft.toggles[field] = !draft.toggles[field];
          saveDraft(targetUserId, draft);
          await updateBuilderMessage(client, targetUserId, draft);
        }
        return;
      }

      // Edit -> open modal
      if (customId.startsWith('announce_edit_')) {
        const field = parts[2];
        const modal = new ModalBuilder().setCustomId(`announce_modal_${field}_${targetUserId}`).setTitle(`Edit ${field}`);
        const input = new TextInputBuilder()
          .setCustomId('value')
          .setLabel(`Enter ${field}`)
          .setStyle(field === 'description' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(true)
          .setValue(draft[field] || '');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal).catch(async (err) => {
          console.error('showModal failed', err);
          try { await interaction.followUp({ content: 'Unable to open modal.', ephemeral: true }); } catch {}
        });
        return;
      }

      // Set channel modal
      if (customId.startsWith('announce_setchannel_')) {
        const modal = new ModalBuilder().setCustomId(`announce_modal_channel_${targetUserId}`).setTitle('Set target channel (mention or id)');
        const input = new TextInputBuilder()
          .setCustomId('value')
          .setLabel('Channel (mention like #announcements or channel ID)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('#announcements or 123456789012345678');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal).catch(async (err) => {
          console.error('channel modal fail', err);
          try { await interaction.followUp({ content: 'Unable to open channel modal.', ephemeral: true }); } catch {}
        });
        return;
      }

      // Custom color modal
      if (customId.startsWith('announce_customcolor_')) {
        const modal = new ModalBuilder().setCustomId(`announce_modal_color_${targetUserId}`).setTitle('Enter hex color (#RRGGBB)');
        const input = new TextInputBuilder()
          .setCustomId('value')
          .setLabel('Hex color (like #ff00aa)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('#ff00aa');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal).catch(async (err) => {
          console.error('color modal fail', err);
          try { await interaction.followUp({ content: 'Unable to open color modal.', ephemeral: true }); } catch {}
        });
        return;
      }

      // Done
      if (customId.startsWith('announce_done_')) {
        saveDraft(targetUserId, draft);
        try { await interaction.followUp({ content: 'Draft saved. Use the preview or confirm commands.', ephemeral: true }); } catch {}
        return;
      }

      // Cancel / delete draft
      if (customId.startsWith('announce_cancel_')) {
        deleteDraft(targetUserId);
        try { await interaction.followUp({ content: 'Draft deleted.', ephemeral: true }); } catch {}
        return;
      }

      // Edit-from-preview -> reopen builder in saved or current channel
      if (customId.startsWith('announce_editbuilder_')) {
        let targetChannel = null;
        if (draft.builderMessage && draft.builderMessage.channelId) {
          targetChannel = await client.channels.fetch(draft.builderMessage.channelId).catch(() => null);
        }
        if (!targetChannel) targetChannel = interaction.channel;
        const embed = buildBuilderEmbed(draft, await client.users.fetch(targetUserId));
        const rows = buildBuilderComponents(targetUserId, draft);
        try {
          const sent = await targetChannel.send({ embeds: [embed], components: rows });
          draft.builderMessage = { channelId: targetChannel.id, messageId: sent.id };
          saveDraft(targetUserId, draft);
          await interaction.followUp({ content: `Builder opened in ${targetChannel}.`, ephemeral: true }).catch(() => {});
        } catch (err) {
          console.error('Reopen builder failed', err);
          await interaction.followUp({ content: 'Failed to reopen builder in that channel.', ephemeral: true }).catch(() => {});
        }
        return;
      }

      // Confirm from preview
      if (customId.startsWith('announce_confirmbtn_')) {
        if (!draft.channelId) {
          await interaction.followUp({ content: 'Target channel not set. Set channel before confirming.', ephemeral: true }).catch(() => {});
          return;
        }
        const ch = await client.channels.fetch(draft.channelId).catch(() => null);
        if (!ch || !ch.isTextBased()) {
          await interaction.followUp({ content: 'Cannot find the target channel or bot lacks access.', ephemeral: true }).catch(() => {});
          return;
        }
        const embed = buildAnnouncementEmbed(draft);
        try {
          await ch.send({ embeds: [embed] });
          deleteDraft(targetUserId);
          await interaction.followUp({ content: `Announcement sent to <#${draft.channelId}>`, ephemeral: true }).catch(() => {});
        } catch (err) {
          console.error('send fail', err);
          await interaction.followUp({ content: 'Failed to send announcement — check bot permissions.', ephemeral: true }).catch(() => {});
        }
        return;
      }

      // Cancel preview
      if (customId.startsWith('announce_cancelpreview_')) {
        // for ephemeral preview, this just dismisses; for normal messages, deletion is handled by message component handler
        try { await interaction.followUp({ content: 'Preview dismissed.', ephemeral: true }); } catch {}
        return;
      }
    }

    // MODAL SUBMITS
    if (isModal) {
      const cid = customId; // announce_modal_<field>_<userId> OR announce_modal_channel_<userId> OR announce_modal_color_<userId>
      const parts2 = cid.split('_');
      const field = parts2[2];

      // channel modal
      if (field === 'channel') {
        const raw = interaction.fields.getTextInputValue('value').trim();
        let match = raw.match(/<#(\d+)>/);
        let id = match ? match[1] : (raw.match(/^\d+$/) ? raw : null);
        if (!id) {
          await interaction.reply({ content: 'Invalid channel. Paste a channel mention like <#123> or the channel ID.', ephemeral: true }).catch(() => {});
          return;
        }
        const ch = await interaction.client.channels.fetch(id).catch(() => null);
        if (!ch || !ch.isTextBased()) {
          await interaction.reply({ content: 'Could not find the channel or it is not a text channel. Make sure the bot is in that guild and has access.', ephemeral: true }).catch(() => {});
          return;
        }
        draft.channelId = id;
        saveDraft(targetUserId, draft);
        await interaction.reply({ content: `Target channel set to <#${id}>.`, ephemeral: true }).catch(() => {});
        await updateBuilderMessage(client, targetUserId, draft);
        return;
      }

      // color modal
      if (field === 'color') {
        const raw = interaction.fields.getTextInputValue('value').trim();
        const hex = raw.startsWith('#') ? raw.slice(1) : raw;
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
          await interaction.reply({ content: 'Invalid hex. Use format like #ff00aa.', ephemeral: true }).catch(() => {});
          return;
        }
        draft.color = parseInt(hex, 16);
        saveDraft(targetUserId, draft);
        await interaction.reply({ content: `Color set to #${hex}`, ephemeral: true }).catch(() => {});
        await updateBuilderMessage(client, targetUserId, draft);
        return;
      }

      // text fields: title, description, footer, image, thumbnail
      const allowed = ['title', 'description', 'footer', 'image', 'thumbnail'];
      if (allowed.includes(field)) {
        const value = interaction.fields.getTextInputValue('value');
        draft[field] = value;
        saveDraft(targetUserId, draft);
        await interaction.reply({ content: `${field} saved.`, ephemeral: true }).catch(() => {});
        await updateBuilderMessage(client, targetUserId, draft);
        return;
      }
    }

    // SELECT MENU (color presets)
    if (isSelect) {
      if (customId.startsWith('announce_color_select_')) {
        await interaction.deferUpdate().catch(() => {});
        const val = interaction.values[0];
        if (val === 'none') draft.color = null;
        else {
          const hex = val.replace('#', '');
          if (/^[0-9a-fA-F]{6}$/.test(hex)) draft.color = parseInt(hex, 16);
        }
        saveDraft(targetUserId, draft);
        await updateBuilderMessage(client, targetUserId, draft);
        return;
      }
    }

  } catch (err) {
    console.error('announceHandler error', err);
  }
}

// attach helpers for reuse by prefix/slash command code
announceHandler.buildBuilderEmbed = buildBuilderEmbed;
announceHandler.buildBuilderComponents = buildBuilderComponents;
announceHandler.buildAnnouncementEmbed = buildAnnouncementEmbed;
announceHandler.updateBuilderMessage = updateBuilderMessage;

module.exports = announceHandler;
