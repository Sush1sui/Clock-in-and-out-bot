import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import {
  addClockRecord,
  chatterRoleId,
  checkClockDBInitialization,
  clockOutRecord,
  InitializeClockDB,
  teamLeaderRoleId,
} from "../../utils/ClockDB_management";
import {
  clock_in_interface,
  clock_out_interface,
} from "../../utils/embedInterface";

export default {
  data: new SlashCommandBuilder()
    .setName("generate_clock_channels")
    .setDescription(
      "Generates clock-in, clock-out, and admin channels for the server"
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
      await interaction.editReply("Setting up channels... please wait.");

      // Check if bot has necessary permissions
      const botMember = await interaction.guild.members.fetch(
        interaction.client.user.id
      );
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.editReply({
          content:
            "❌ I don't have the 'Manage Channels' permission. Please give me this permission and try again.",
        });
        return;
      }

      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.editReply({
          content:
            "❌ I don't have the 'Manage Roles' permission. Please give me this permission and try again.",
        });
        return;
      }

      const isCLockDBInitialized = await checkClockDBInitialization();
      if (isCLockDBInitialized) {
        await interaction.editReply({
          content: "ClockDB is already initialized.",
        });
        return;
      }

      // Create the category
      const category = await interaction.guild.channels.create({
        name: "⏰ Time Tracking",
        type: 4, // CategoryChannel type
        reason: "Clock-in/out bot setup",
      });

      // Create clock-in channel
      const clockInChannel = await interaction.guild.channels.create({
        name: "🟢-clock-in",
        type: 0, // TextChannel type
        parent: category.id,
        reason: "Clock-in channel for time tracking",
      });

      // Create clock-out channel
      const clockOutChannel = await interaction.guild.channels.create({
        name: "🔴-clock-out",
        type: 0, // TextChannel type
        parent: category.id,
        reason: "Clock-out channel for time tracking",
      });

      // Create admin channel
      const adminChannel = await interaction.guild.channels.create({
        name: "⚙️-time-admin",
        type: 0, // TextChannel type
        parent: category.id,
        reason: "Admin channel for time tracking management",
      });

      const clockInRole = await interaction.guild.roles.create({
        name: "Clocked In",
        color: "Green",
      });

      const clockInInterface = await clockInChannel.send(clock_in_interface);
      if (!clockInInterface) {
        await interaction.editReply({
          content: "Failed to send clock-in interface message.",
        });
        return;
      }
      const clockOutInterface = await clockOutChannel.send(clock_out_interface);
      if (!clockOutInterface) {
        await interaction.editReply({
          content: "Failed to send clock-out interface message.",
        });
        return;
      }

      const clockDB = await InitializeClockDB(
        category.id,
        clockInChannel.id,
        clockInInterface.id,
        clockOutChannel.id,
        clockOutInterface.id,
        adminChannel.id,
        clockInRole.id
      );

      if (!clockDB) {
        await interaction.editReply({
          content: "Failed to initialize ClockDB.",
        });
        return;
      }

      const clockIn_collector =
        clockInInterface.createMessageComponentCollector();
      const clockOut_collector =
        clockOutInterface.createMessageComponentCollector();

      // CLOCK IN BUTTON HANDLER
      clockIn_collector.on("collect", async (interaction_button) => {
        if (!interaction_button.isButton()) return;

        console.log("Clock In button clicked by:", interaction_button.user.id);

        const member = await interaction_button.guild?.members.fetch(
          interaction_button.user.id
        );

        if (!member.roles.cache.hasAny(chatterRoleId, teamLeaderRoleId)) {
          await interaction_button.reply({
            content: "You are not allowed to clock in.",
            flags: "Ephemeral",
          });
          return;
        }

        if (member.roles.cache.has(clockInRole.id)) {
          await interaction_button.reply({
            content: "You are already clocked in.",
            flags: "Ephemeral",
          });
          return;
        }

        await member.roles.add(clockInRole.id);
        await interaction_button.reply({
          embeds: [
            {
              color: 0x00ff00,
              title: "Clock In Successful",
              description: `<@${interaction_button.user.id}> has been clocked in. Failing to clock out within 12 hours from now will result in an absent (Hours within the day of clock in won't be counted).`,
              footer: {
                text: "Time Tracking Bot",
                icon_url: interaction_button.guild.iconURL() || "",
              },
            },
          ],
          flags: "Ephemeral",
        });

        await adminChannel.send({
          content: `🟢 <@${
            interaction_button.user.id
          }> has clocked in at <t:${Math.floor(Date.now() / 1000)}:F>`,
        });

        await addClockRecord(interaction_button.user.id);
      });

      // CLOCK OUT BUTTON HANDLER
      clockOut_collector.on("collect", async (interaction_button) => {
        if (!interaction_button.isButton()) return;

        console.log("Clock Out button clicked by:", interaction_button.user.id);

        const member = await interaction_button.guild?.members.fetch(
          interaction_button.user.id
        );

        if (!member.roles.cache.hasAny(chatterRoleId, teamLeaderRoleId)) {
          await interaction_button.reply({
            content: "You are not allowed to clock in.",
            flags: "Ephemeral",
          });
          return;
        }

        if (!member.roles.cache.has(clockInRole.id)) {
          await interaction_button.reply({
            content: "You are not clocked in.",
            flags: "Ephemeral",
          });
          return;
        }

        await member.roles.remove(clockInRole.id);
        await interaction_button.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "Clock Out Successful",
              description: `<@${interaction_button.user.id}> has been clocked out.`,
              footer: {
                text: "Time Tracking Bot",
                icon_url: interaction_button.guild.iconURL() || "",
              },
            },
          ],
          flags: "Ephemeral",
        });

        await adminChannel.send({
          content: `🔴 <@${
            interaction_button.user.id
          }> has clocked out at <t:${Math.floor(Date.now() / 1000)}:F>`,
        });

        await clockOutRecord(interaction_button.user.id);
      });

      await interaction.editReply({
        content:
          `✅ Successfully created time tracking channels!\n\n` +
          `📁 Category: ${category}\n` +
          `🟢 Clock In: ${clockInChannel}\n` +
          `🔴 Clock Out: ${clockOutChannel}\n` +
          `⚙️ Admin: ${adminChannel}`,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "Something went wrong while generating clock channels.",
      });
    }
  },
};
