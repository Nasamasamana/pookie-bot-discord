// commands/announceRegisterSlash.js
// Run p!announceRegisterSlash in each guild where you want /announce commands to appear.
// This registers a guild-scoped /announce command (with subcommands) and attaches a slash handler.

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType } = require('discord.js');
const announceHandler = require('../interactions/announceHandler');
const { getDraft, saveDraft, deleteDraft } = require('../utils/drafts');

module.exports = {
  name: 'announceRegisterSlash',
  async execute({ message, client }) {
    try {
      if (!message.guild) return message.reply('Run this command in a server channel.');

      // attach generic interactions handler if not attached
      if (!client.__announceHandlerAttached) {
        client.on('interactionCreate', async (interaction) => {
          try {
            // chat input commands handled by the following block — but non-chat interactions go to announceHandler
            if (!interaction.isChatInputCommand()) {
              await announceHandler(interaction, client);
            }
          } catch (err) {
            console.error('interaction handler error:', err);
            try {
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Error handling interaction.', ephemeral: true });
              }
            } catch {}
          }
        });
        client.__announceHandlerAttached = true;
      }

      // attach slash-chat handler once
      if (!client.__announceSlashHandlerAttached) {
        client.on('interactionCreate', async (interaction) => {
          try {
            if (!interaction.isChatInputCommand()) return;
            if (interaction.commandName !== 'announce') return;

            const sub = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            const draft = getDraft(userId);

            const buildBuilderEmbed = announceHandler.buildBuilderEmbed;
            const buildBuilderComponents = announceHandler.buildBuilderComponents;
            const buildAnnouncementEmbed = announceHandler.buildAnnouncementEmbed;
            const updateBuilderMessage = announceHandler.updateBuilderMessage;

            // create
            if (sub === 'create') {
              await interaction.deferReply({ ephemeral: true });
              const channelOpt = interaction.options.getChannel('channel');
              if (channelOpt && channelOpt.isTextBased()) {
                draft.channelId = channelOpt.id;
                saveDraft(userId, draft);
              }

              const embed = buildBuilderEmbed(draft, interaction.user);
              const components = buildBuilderComponents(userId, draft);

              const sent = await interaction.channel.send({ embeds: [embed], components }).catch(async (err) => {
                console.error('failed send builder', err);
                await interaction.editReply({ content: 'Failed to send builder message in this channel (check permissions).', ephemeral: true });
                return null;
              });
              if (!sent) return;

              draft.builderMessage = { channelId: interaction.channel.id, messageId: sent.id };
              saveDraft(userId, draft);

              return interaction.editReply({ content: `Builder created in ${interaction.channel}. Use the builder buttons to edit.`, ephemeral: true });
            }

            // preview (ephemeral)
            if (sub === 'preview') {
              const embed = buildAnnouncementEmbed(draft);
              const rows = [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId(`announce_editbuilder_${userId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Primary),
                  new ButtonBuilder().setCustomId(`announce_confirmbtn_${userId}`).setLabel('✅ Confirm & Send').setStyle(ButtonStyle.Success),
                  new ButtonBuilder().setCustomId(`announce_cancelpreview_${userId}`).setLabel('Dismiss').setStyle(ButtonStyle.Danger)
                )
              ];
              return interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
            }

            // edit
            if (sub === 'edit') {
              await interaction.deferReply({ ephemeral: true });
              let targetChannel = null;
              if (draft.builderMessage && draft.builderMessage.channelId) {
                targetChannel = await client.channels.fetch(draft.builderMessage.channelId).catch(() => null);
              }
              if (!targetChannel) targetChannel = interaction.channel;

              const embed = buildBuilderEmbed(draft, interaction.user);
              const rows = buildBuilderComponents(userId, draft);
              const sent = await targetChannel.send({ embeds: [embed], components: rows }).catch(async (err) => {
                console.error('reopen builder fail', err);
                await interaction.editReply({ content: 'Failed to reopen builder in that channel.', ephemeral: true });
                return null;
              });
              if (!sent) return;
              draft.builderMessage = { channelId: targetChannel.id, messageId: sent.id };
              saveDraft(userId, draft);

              return interaction.editReply({ content: `Builder reopened in ${targetChannel}.`, ephemeral: true });
            }

            // confirm
            if (sub === 'confirm') {
              await interaction.deferReply({ ephemeral: true });
              if (!draft.channelId) return interaction.editReply({ content: 'No target channel set in your draft. Open the builder and set one first.', ephemeral: true });
              const ch = await client.channels.fetch(draft.channelId).catch(() => null);
              if (!ch || !ch.isTextBased()) return interaction.editReply({ content: 'Cannot reach the target channel or it is not a text channel.', ephemeral: true });

              const finalEmbed = buildAnnouncementEmbed(draft);
              try {
                await ch.send({ embeds: [finalEmbed] });
                deleteDraft(userId);
                return interaction.editReply({ content: `Announcement sent to <#${draft.channelId}>`, ephemeral: true });
              } catch (err) {
                console.error('send fail', err);
                return interaction.editReply({ content: 'Failed to send — check bot permissions in the target channel.', ephemeral: true });
              }
            }

          } catch (err) {
            console.error('slash handler error', err);
            try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Internal error handling /announce.', ephemeral: true }); } catch {}
          }
        });

        client.__announceSlashHandlerAttached = true;
      }

      // register guild command
      const data = {
        name: 'announce',
        description: 'Announcement builder and preview',
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
            description: 'Preview your saved announcement (ephemeral, visible only to you)'
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

      const existing = await message.guild.commands.fetch();
      const found = existing.find(c => c.name === 'announce');

      if (found) {
        await message.guild.commands.edit(found.id, data);
      } else {
        await message.guild.commands.create(data);
      }

      return message.reply('Slash command `/announce` registered in this server. Use /announce create|preview|edit|confirm.');
    } catch (err) {
      console.error('announceRegisterSlash error', err);
      return message.reply('Failed to register slash command — check logs and bot permissions (applications.commands).');
    }
  }
};
