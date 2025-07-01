import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export const clock_in_embed = new EmbedBuilder()
  .setColor("#00FF00")
  .setTitle("🟢 Clock In System")
  .setDescription(
    "**Ready to start your shift?**\n\nClick the button below to clock in and begin tracking your work time."
  )
  .addFields({
    name: "📋 What happens when you clock in:",
    value:
      "• You'll receive the **Clocked In** role\n• Your start time will be recorded\n• You'll get a confirmation message",
    inline: false,
  })
  .setFooter({
    text: "Time Tracking Bot • Click the button to get started",
    iconURL: "https://cdn.discordapp.com/emojis/1234567890.png", // You can replace with your bot's avatar
  });

export const clock_out_embed = new EmbedBuilder()
  .setColor("#FF0000")
  .setTitle("🔴 Clock Out System")
  .setDescription(
    "**Finishing your shift?**\n\nClick the button below to clock out and stop tracking your work time."
  )
  .addFields({
    name: "📋 What happens when you clock out:",
    value:
      "• The **Clocked In** role will be removed\n• Your end time will be recorded\n• Total work time will be calculated",
    inline: false,
  })
  .setFooter({
    text: "Time Tracking Bot • Click the button to finish your shift",
    iconURL: "https://cdn.discordapp.com/emojis/1234567890.png",
  });

// Clock In Button
export const clock_in_button =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("clock_in")
      .setLabel("🟢 Clock In")
      .setStyle(ButtonStyle.Success)
      .setEmoji("⏰")
  );

// Clock Out Button
export const clock_out_button =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("clock_out")
      .setLabel("🔴 Clock Out")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⏹️")
  );

// Combined interface for clock in (embed + button)
export const clock_in_interface = {
  embeds: [clock_in_embed],
  components: [clock_in_button],
};

// Combined interface for clock out (embed + button)
export const clock_out_interface = {
  embeds: [clock_out_embed],
  components: [clock_out_button],
};
