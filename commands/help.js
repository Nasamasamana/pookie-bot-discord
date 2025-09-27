import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

export const name = "help";
export const description = "List all available commands (paginated)";

export async function execute(message, args) {
  const commands = Array.from(message.client.commands.values());
  if (!commands.length) return message.reply("❌ No commands available.");

  // Split commands into pages (max 5 per page)
  const pageSize = 5;
  const pages = [];
  for (let i = 0; i < commands.length; i += pageSize) {
    const chunk = commands.slice(i, i + pageSize);
    const embed = new EmbedBuilder()
      .setTitle("🤖 Available Commands")
      .setColor(0x00ffff)
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    chunk.forEach(cmd => {
      embed.addFields({ name: `p!${cmd.name}`, value: cmd.description || "No description", inline: false });
    });

    embed.setDescription(`Page ${Math.floor(i / pageSize) + 1} of ${Math.ceil(commands.length / pageSize)}`);
    pages.push(embed);
  }

  let currentPage = 0;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary)
  );

  const helpMessage = await message.channel.send({ embeds: [pages[currentPage]], components: pages.length > 1 ? [row] : [] });

  if (pages.length === 1) return; // No pagination needed

  const filter = i => i.user.id === message.author.id;
  const collector = helpMessage.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

  collector.on("collect", async i => {
    if (i.customId === "prev") {
      currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
    } else if (i.customId === "next") {
      currentPage = currentPage < pages.length - 1 ? currentPage + 1 : 0;
    }
    await i.update({ embeds: [pages[currentPage]], components: [row] });
  });

  collector.on("end", () => {
    // Disable buttons after timeout
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary).setDisabled(true)
    );
    helpMessage.edit({ components: [disabledRow] }).catch(() => {});
  });
}
