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

// --- helpers ---
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

function buildBuilderComponents(userId, draft) {
  const rows = [];

  // row 1
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_toggle_title_${userId}`).setLabel(`Title: ${draft.toggles.title ? 'ON' : 'OFF'}`).setStyle(draft.toggles.title ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_title_${userId}`).setLabel('Edit Title').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.title),
    new ButtonBuilder().setCustomId(`announce_toggle_description_${userId}`).setLabel(`Desc: ${draft.toggles.description ? 'ON' : 'OFF'}`).setStyle(draft.toggles.description ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_description_${userId}`).setLabel('Edit Desc').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.description)
  ));

  // row 2
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

  // row 3
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_toggle_footer_${userId}`).setLabel(`Footer: ${draft.toggles.footer ? 'ON' : 'OFF'}`).setStyle(draft.toggles.footer ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_footer_${userId}`).setLabel('Edit Footer').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.footer),
    new ButtonBuilder().setCustomId(`announce_toggle_image_${userId}`).setLabel(`Image: ${draft.toggles.image ? 'ON' : 'OFF'}`).setStyle(draft.toggles.image ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_image_${userId}`).setLabel('Edit Image URL').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.image)
  ));

  // row 4
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`announce_toggle_thumbnail_${userId}`).setLabel(`Thumb: ${draft.toggles.thumbnail ? 'ON' : 'OFF'}`).setStyle(draft.toggles.thumbnail ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`announce_edit_thumbnail_${userId}`).setLabel('Edit Thumbnail URL').setStyle(ButtonStyle.Primary).setDisabled(!draft.toggles.thumbnail),
    new ButtonBuilder().setCustomId(`announce_cancel_${userId}`).setLabel('Cancel / Delete Draft').setStyle(ButtonStyle.Danger)
  ));

  return rows;
}

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

// --- main handler function ---
async function announceHandler(interaction, client) {
  try {
    const customId = interaction.customId || (interaction.isStringSelectMenu() && interaction.customId);
    if (!customId || !customId.startsWith('announce_')) return;

    const parts = customId.split('_');
    const targetUserId = parts[parts.length - 1];

    if (interaction.user.id !== targetUserId) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `This control belongs to <@${targetUserId}>.`, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: `This control belongs to <@${targetUserId}>.`, ephemeral: true }).catch(() => {});
      }
      return;
    }

    const draft = getDraft(targetUserId);

    // BUTTONS
    if (interaction.isButton()) {
      await interaction.deferUpdate().catch(() => {});
      // toggle
      if (customId.startsWith('announce_toggle_')) {
        const field = parts[2];
        draft.toggles[field] = !draft.toggles[field];
        saveDraft(targetUserId, draft);
        await updateBuilderMessage(client, targetUserId, draft);
        return;
      }

      // edit field -> modal
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
        await interaction.showModal(modal).catch(async () => {
          await interaction.followUp({ content: 'Unable to open modal.', ephemeral: true }).catch(() => {});
        });
        return;
      }

      // set channel
      if (customId.startsWith('announce_setchannel_')) {
        const modal = new ModalBuilder().setCustomId(`announce_modal_channel_${targetUserId}`).setTitle('Set target channel (mention or id)');
        const input = new TextInputBuilder()
          .setCustomId('value')
          .setLabel('Channel (mention like #announcements or channel ID)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('#announcements or 123456789012345678');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal).catch(async () => {
          await interaction.followUp({ content: 'Unable to open modal for channel.', ephemeral: true }).catch(() => {});
        });
        return;
      }

      // custom color
      if (customId.startsWith('announce_customcolor_')) {
        const modal = new ModalBuilder().setCustomId(`announce_modal_color_${targetUserId}`).setTitle('Enter hex color (#RRGGBB)');
        const input = new TextInputBuilder()
          .setCustomId('value')
          .setLabel('Hex color (like #ff00aa)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('#ff00aa');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal).catch(async () => {
          await interaction.followUp({ content: 'Unable to open color modal.', ephemeral: true }).catch(() => {});
        });
        return;
      }

      // done
      if (customId.startsWith('announce_done_')) {
        saveDraft(targetUserId, draft);
        await interaction.followUp({ content: 'Draft saved. Use `p!announce_preview` to preview, `p!announce_edit` to reopen builder, or `p!confirm_announce` to send.', ephemeral: true }).catch(() => {});
        return;
      }

      // cancel / delete draft
      if (customId.startsWith('announce_cancel_')) {
        deleteDraft(targetUserId);
        await interaction.followUp({ content: 'Draft deleted.', ephemeral: true }).catch(() => {});
        return;
      }

      // edit-from-preview: re-send builder in saved channel or current channel
      if (customId.startsWith('announce_editbuilder_')) {
        // try to send builder to original builder channel if exists, else to current channel
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
          await interaction.followUp({ content: `Builder opened in ${targetChannel.isDMBased ? 'your DMs' : `<#${targetChannel.id}>`}.`, ephemeral: true }).catch(() => {});
        } catch (err) {
          console.error('Failed to reopen builder', err);
          await interaction.followUp({ content: 'Failed to reopen builder in that channel.', ephemeral: true }).catch(() => {});
        }
        return;
      }

      // confirm from preview
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
          console.error(err);
          await interaction.followUp({ content: 'Failed to send announcement — check bot permissions.', ephemeral: true }).catch(() => {});
        }
        return;
      }

      // cancel preview
      if (customId.startsWith('announce_cancelpreview_')) {
        await interaction.followUp({ content: 'Preview canceled.', ephemeral: true }).catch(() => {});
        return;
      }
    }

    // MODAL SUBMITS
    if (interaction.isModalSubmit()) {
      const cid = interaction.customId; // announce_modal_<field>_<userId>
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

    // SELECT MENU (colors)
    if (interaction.isStringSelectMenu()) {
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

// attach helpers to function object so commands can reuse them
announceHandler.buildBuilderEmbed = buildBuilderEmbed;
announceHandler.buildBuilderComponents = buildBuilderComponents;
announceHandler.buildAnnouncementEmbed = buildAnnouncementEmbed;
announceHandler.updateBuilderMessage = updateBuilderMessage;

module.exports = announceHandler;
