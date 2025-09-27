// commands/announce_register_slash.js
// Drop this file into your existing commands/ directory.
// Run it once as a prefix command (p!announce_register_slash) in each guild where you want slash support.
// It will register a guild-level /announce command (subcommands) and attach an interaction handler
// that delegates to your existing interactions/announceHandler for buttons/modals/selects.

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType } = require('discord.js');
const announceHandler = require('../interactions/announceHandler'); // must exist (the file you already have)
const { getDraft, saveDraft } = require('../utils/drafts');

module.exports = {
  name: 'announce_register_slash',
  async execute({ message, client }) {
    try {
      if (!message.guild) return message.reply('Run this command in a server (guild) channel, not in DMs.');

      // ensure interactions handler is attached once (for button/modal/select handling)
      if (!client.__announceHandlerAttached) {
        client.on('interactionCreate', async (interaction) => {
          try {
            // If a chat input command, we handle it below; otherwise delegate to announceHandler
            if (interaction.isChatInputCommand()) {
              // handled in the other listener below (we attach a dedicated handler for slash commands too)
              // leave it to the slash-specific listener created below.
            } else {
              // delegate to your existing announceHandler (handles buttons, modals, selects)
              await announceHandler(interaction, client);
            }
          } catch (err) {
            console.error('interactionCreate => announceHandler error:', err);
            try {
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Error handling interaction (buttons/modals).', ephemeral: true });
              }
            } catch {}
          }
        });
        client.__announceHandlerAttached = true;
      }

      // attach slash handler if not attached (this one handles ChatInputCommand subcommands)
      if (!client.__announceSlashHandlerAttached) {
        client.on('interactionCreate', async (interaction) => {
          try {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName !== 'announce') return;

            const sub = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            // ensure a draft exists for the user
            const draft = getDraft(userId);

            // Helper builders from your interactions file
            const buildBuilderEmbed = announceHandler.buildBuilderEmbed;
            const buildBuilderComponents = announceHandler.buildBuilderComponents;
            const buildAnnouncementEmbed = announceHandler.buildAnnouncementEmbed;
            const updateBuilderMessage = announceHandler.updateBuilderMessage;

            // ---- SUBCOMMAND: create ----
            if (sub === 'create') {
              await interaction.deferReply({ ephemeral: true });
              // optional channel option
              const channelOpt = interaction.options.getChannel('channel');
              if (channelOpt && channelOpt.isTextBased()) {
                draft.channelId = channelOpt.id;
                saveDraft(userId, draft);
              }

              // build builder message in the current channel
              const embed = buildBuilderEmbed(draft, interaction.user);
              const components = buildBuilderComponents(userId, draft);

              // send builder message in the channel where command used
              const sent = await interaction.channel.send({ embeds: [embed], components }).catch(async (err) => {
                console.error('Failed to send builder message:', err);
                await interaction.editReply({ content: 'Failed to send builder message in this channel (check permissions).', embeds: [], components: [] });
                return null;
              });
              if (!sent) return;

              draft.builderMessage = { channelId: interaction.channel.id, messageId: sent.id };
              saveDraft(userId, draft);

              await interaction.editReply({ content: `Announcement builder created in ${interaction.channel}. Use the buttons to edit/toggle fields.`, ephemeral: true });
              return;
            }

            // ---- SUBCOMMAND: preview ----
            if (sub === 'preview') {
              // ephemeral preview (only visible to the user in this channel)
              const embed = buildAnnouncementEmbed(draft);
              const rows = [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId(`announce_editbuilder_${userId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Primary),
                  new ButtonBuilder().setCustomId(`announce_confirmbtn_${userId}`).setLabel('✅ Confirm & Send').setStyle(ButtonStyle.Success),
                  new ButtonBuilder().setCustomId(`announce_cancelpreview_${userId}`).setLabel('Dismiss').setStyle(ButtonStyle.Danger)
                )
              ];

              // reply ephemeral with embed and Dismiss button
              await interaction.reply({ embeds: [embed], components: rows, ephemeral: true }).catch(async (err) => {
                console.error('Failed to send ephemeral preview:', err);
                try { await interaction.reply({ content: 'Could not send ephemeral preview.', ephemeral: true }); } catch {}
              });
              return;
            }

            // ---- SUBCOMMAND: edit ----
            if (sub === 'edit') {
              await interaction.deferReply({ ephemeral: true });

              // try to reopen builder in original builder channel; if missing, use current channel
              let targetChannel = null;
              if (draft.builderMessage && draft.builderMessage.channelId) {
                targetChannel = await client.channels.fetch(draft.builderMessage.channelId).catch(() => null);
              }
              if (!targetChannel) targetChannel = interaction.channel;

              const embed = buildBuilderEmbed(draft, interaction.user);
              const rows = buildBuilderComponents(userId, draft);
              const sent = await targetChannel.send({ embeds: [embed], components: rows }).catch(async (err) => {
                console.error('Failed to reopen builder:', err);
                await interaction.editReply({ content: 'Failed to reopen builder in that channel.', ephemeral: true });
                return null;
              });
              if (!sent) return;
              draft.builderMessage = { channelId: targetChannel.id, messageId: sent.id };
              saveDraft(userId, draft);

              await interaction.editReply({ content: `Builder reopened in ${targetChannel}.`, ephemeral: true });
              return;
            }

            // ---- SUBCOMMAND: confirm ----
            if (sub === 'confirm') {
              await interaction.deferReply({ ephemeral: true });
              if (!draft.channelId) {
                return interaction.editReply({ content: 'No target channel set in your draft. Open the builder and set a channel first.', ephemeral: true });
              }
              const ch = await client.channels.fetch(draft.channelId).catch(() => null);
              if (!ch || !ch.isTextBased()) {
                return interaction.editReply({ content: 'Cannot reach the target channel or it is not a text channel.', ephemeral: true });
              }
              const finalEmbed = buildAnnouncementEmbed(draft);
              try {
                await ch.send({ embeds: [finalEmbed] });
                // clear draft after sending
                const { deleteDraft } = require('../utils/drafts');
                deleteDraft(userId);
                return interaction.editReply({ content: `Announcement sent to <#${draft.channelId}>`, ephemeral: true });
              } catch (err) {
                console.error('Failed to send announcement:', err);
                return interaction.editReply({ content: 'Failed to send announcement — check bot permissions in the target channel.', ephemeral: true });
              }
            }

          } catch (err) {
            console.error('Slash announce handler error:', err);
            try {
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Internal error handling /announce. Check bot logs.', ephemeral: true });
              } else {
                await interaction.editReply({ content: 'Internal error handling /announce. Check bot logs.' });
              }
            } catch {}
          }
        });

        client.__announceSlashHandlerAttached = true;
      }

      // Now register the slash command in this guild (create or edit so it appears instantly)
      const guild = message.guild;
      const data = {
        name: 'announce',
        description: 'Announcement tools (create / preview / edit / confirm)',
        options: [
          {
            name: 'create',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Open the interactive announcement builder in this channel',
            options: [
              {
                name: 'channel',
                type: ApplicationCommandOptionType.Channel,
                description: 'Optional: set a target channel now',
                required: false
              }
            ]
          },
          {
            name: 'preview',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Preview your saved announcement (only visible to you in-channel)'
          },
          {
            name: 'edit',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Reopen the builder to edit your saved draft'
          },
          {
            name: 'confirm',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Send your saved announcement to the target channel'
          }
        ]
      };

      // Fetch existing guild commands and create or edit our 'announce' command
      const existing = await guild.commands.fetch();
      const found = existing.find(c => c.name === 'announce');

      if (found) {
        await guild.commands.edit(found.id, data);
      } else {
        await guild.commands.create(data);
      }

      return message.reply('Slash command `/announce` has been registered in this server. Use /announce create|preview|edit|confirm. (You can delete this registration command after.)');
    } catch (err) {
      console.error('announce_register_slash error:', err);
      try { await message.reply('Failed to register slash command — check bot logs and that bot has "applications.commands" permission.'); } catch {}
    }
  }
};
