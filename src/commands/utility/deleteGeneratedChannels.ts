import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import ClockChannelsModel from "../../models/ClockChannels.model";

export default {
  data: new SlashCommandBuilder()
    .setName("delete_generated_channels")
    .setDescription("Deletes all generated clock channels in the server")
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
      await interaction.editReply(
        "Deleting generated channels... please wait."
      );

      // Fetch all channels in the guild
      const channels = await interaction.guild.channels.fetch();
      const clockChannels = await ClockChannelsModel.findOne();

      // Filter channels that start with "clock-in-" or "clock-out-"
      const generatedChannels = channels.filter(
        (channel) =>
          channel?.id === clockChannels?.clockInChannelId ||
          channel?.id === clockChannels?.clockOutChannelId ||
          channel?.id === clockChannels?.adminChannelId ||
          channel?.id === clockChannels?.categoryId
      );

      if (generatedChannels.size === 0) {
        await interaction.editReply(
          "No generated clock channels found to delete."
        );
        return;
      }

      // Delete each generated channel
      for (const channel of generatedChannels.values()) {
        await channel?.delete();
      }

      await ClockChannelsModel.deleteMany();

      await interaction.editReply(
        "All generated clock channels have been deleted successfully."
      );
    } catch (error) {
      console.error(
        "Error executing delete_generated_channels command:",
        error
      );
      await interaction.reply({
        content: "An error occurred while trying to delete generated channels.",
        flags: "Ephemeral",
      });
      return;
    }
  },
};
