import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import ClockRecordModel from "../../models/ClockRecord.model";

export default {
  data: new SlashCommandBuilder()
    .setName("get_user_current_total_hours")
    .setDescription("Get the current total hours for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get the total hours for")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const member = interaction.member;
      if (!member || !interaction.guild) {
        await interaction.reply({
          content: "This command can only be used in a guild.",
          flags: "Ephemeral",
        });
        return;
      }

      await interaction.deferReply();
      await interaction.editReply({
        content: "Fetching your current total hours...",
      });

      const user = interaction.options.getUser("user");
      if (!user) {
        await interaction.editReply({
          content: "User not found.",
        });
        return;
      }

      const clockRecord = await ClockRecordModel.findOne({ userId: user.id });
      if (!clockRecord) {
        await interaction.editReply({
          content: "No clock record found for this user.",
        });
        return;
      }
      if (clockRecord.totalHours === undefined) {
        await interaction.editReply({
          content: "This user's total hours have not been set yet.",
        });
        return;
      }
      if (clockRecord.totalHours === 0) {
        await interaction.editReply({
          content: "This user has 0 hour for this week.",
        });
        return;
      }
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Total Hours")
            .setDescription(
              `Total hours for ${user.username}: ${clockRecord.totalHours} hours`
            ),
        ],
      });
      return;
    } catch (error) {
      console.error(
        "Error executing get_user_current_total_hours command:",
        error
      );
      await interaction.reply({
        content: "An error occurred while fetching the total hours.",
        flags: "Ephemeral",
      });
    }
  },
};
