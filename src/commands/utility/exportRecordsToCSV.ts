import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { exportRecordsToCSV } from "../../utils/ClockDB_management";
import * as fs from "fs";

export default {
  data: new SlashCommandBuilder()
    .setName("export_records_to_csv")
    .setDescription("Exports current clock records to a CSV file")
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

      await interaction.deferReply({ flags: "Ephemeral" });
      await interaction.editReply({
        content: "Exporting records to CSV... please wait.",
      });

      const filePath = await exportRecordsToCSV();

      if (!filePath) {
        await interaction.editReply({
          content: "No records found to export or an error occurred.",
        });
        return;
      }

      // Create attachment from the CSV file
      const attachment = new AttachmentBuilder(filePath);

      await interaction.editReply({
        content: "Records have been successfully exported to CSV.",
      });

      await interaction.followUp({
        content: "Here is the exported CSV file:",
        files: [attachment],
      });

      // Delete the file after uploading
      try {
        fs.unlinkSync(filePath);
        console.log(`CSV file deleted after upload: ${filePath}`);
      } catch (deleteError) {
        console.error("Error deleting CSV file:", deleteError);
      }
    } catch (error) {
      console.error("Error executing export_records_to_csv command:", error);
      await interaction.reply({
        content: "An error occurred while exporting records to CSV.",
        flags: "Ephemeral",
      });
    }
  },
};
