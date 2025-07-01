import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import {
  chatterRoleId,
  teamLeaderRoleId,
} from "../../utils/ClockDB_management";
import ClockRecordModel from "../../models/ClockRecord.model";

export default {
  data: new SlashCommandBuilder()
    .setName("current_total_hours")
    .setDescription("Get your current total hours"),
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

      if (
        !interaction.guild.members.cache
          .get(member.user.id)
          ?.roles.cache.hasAny(chatterRoleId, teamLeaderRoleId)
      ) {
        await interaction.reply({
          content: "You don't have a chatter or team leader role.",
          flags: "Ephemeral",
        });
        return;
      }

      await interaction.deferReply({ flags: "Ephemeral" });
      await interaction.editReply({
        content: "Fetching your current total hours...",
      });

      const clockRecord = await ClockRecordModel.findOne({
        userId: member.user.id,
      });

      if (!clockRecord) {
        await interaction.editReply({
          content: "No clock record found for you.",
        });
        return;
      }

      if (clockRecord.totalHours === undefined) {
        await interaction.editReply({
          content: "Your total hours have not been set yet.",
        });
        return;
      }

      if (clockRecord.totalHours === 0) {
        await interaction.editReply({
          content: "You have not clocked in yet.",
        });
        return;
      }

      await interaction.editReply({
        content: `Your current total hours are: ${clockRecord.totalHours} hours.`,
      });
      return;
    } catch (error) {
      console.error("Error executing current_total_hours command:", error);
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: "Ephemeral",
      });
    }
  },
};
