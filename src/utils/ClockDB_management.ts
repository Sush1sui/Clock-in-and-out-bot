import "dotenv/config";
import { TextChannel } from "discord.js";
import { client } from "../bot";
import ClockChannelsModel from "../models/ClockChannels.model";
import ClockRecordModel from "../models/ClockRecord.model";
import * as fs from "fs";
import * as path from "path";

export const teamLeaderRoleId = process.env.TL_ROLE_ID || "1379485478721552504"; // Default to a specific role ID if not set
export const chatterRoleId =
  process.env.CHATTER_ROLE_ID || "1312607061015793714"; // Default to a specific role ID if not set
const guildId = process.env.GUILD_ID || "1312604320650235945"; // Default to a specific guild ID if not set

const ROLE_ID_TIME_LIMITS: { [key: string]: number } = {
  [teamLeaderRoleId]: 12.25, // 12 hours 15 minutes
  [chatterRoleId]: 16.25, // 16 hours 15 minutes
};

export async function checkClockDBInitialization() {
  // This function checks if the ClockDB is already initialized.
  // It should be called when the bot starts or when the command is executed.

  try {
    const clockChannels = await ClockChannelsModel.findOne({});
    if (clockChannels) {
      console.log("ClockDB is already initialized:", clockChannels);
      return true;
    } else {
      console.log("ClockDB is not initialized.");
      return false;
    }
  } catch (error) {
    console.error("Error checking ClockDB initialization:", error);
    return false;
  }
}

export async function InitializeClockDB(
  category_id: string,
  clock_in_channel_id: string,
  clock_in_interface_id: string,
  clock_out_channel_id: string,
  clockout_interface_id: string,
  admin_channel_id: string,
  clock_in_role_id: string
) {
  // This function initializes the ClockDB with the provided channel IDs and category ID.
  // It should be called when the bot is ready or when the channels are created.

  // Example of how you might use these parameters:
  console.log(`Initializing ClockDB with Category ID: ${category_id}`);
  console.log(`Clock In Channel ID: ${clock_in_channel_id}`);
  console.log(`Clock Out Channel ID: ${clock_out_channel_id}`);
  console.log(`Admin Channel ID: ${admin_channel_id}`);
  try {
    const clockChannels = await ClockChannelsModel.create({
      categoryId: category_id,
      clockInChannelId: clock_in_channel_id,
      clockOutChannelId: clock_out_channel_id,
      adminChannelId: admin_channel_id,
      clockInRoleId: clock_in_role_id,
      clockInInterfaceId: clock_in_interface_id,
      clockOutInterfaceId: clockout_interface_id,
    });

    console.log("ClockDB initialized successfully:", clockChannels);
    return clockChannels;
  } catch (error) {
    console.error("Error initializing ClockDB:", error);
    return null;
  }
}

export async function addClockRecord(userId: string) {
  try {
    const clockInTime = new Date(); // Use current time for clock in

    const existingRecord = await ClockRecordModel.findOne({
      userId,
    });

    if (existingRecord) {
      if (existingRecord?.clockInTime && !existingRecord?.clockOutTime) {
        console.error("User already has an active clock-in record:", userId);
        return null; // Don't allow multiple active clock-ins
      }
      // If the user has an existing record but no clock-in time, update it
      existingRecord.clockInTime = clockInTime;
      existingRecord.clockOutTime = undefined;
      await existingRecord.save();
      console.log("Clock record added:", existingRecord);
      return existingRecord;
    }

    // Create a new clock-in record
    const clockRecord = await ClockRecordModel.create({
      userId,
      clockInTime,
    });

    console.log("Clock record added:", clockRecord);
    return clockRecord;
  } catch (error) {
    console.error("Error adding clock record:", error);
    return null;
  }
}

export async function clockOutRecord(userId: string) {
  // This function updates the clock record for a user when they clock out.
  // It should be called when a user clocks out.

  try {
    const clockOutTime = new Date(); // Use current time for clock out

    // First find the existing record to get the clockInTime
    const existingRecord = await ClockRecordModel.findOne({
      userId,
      clockOutTime: null, // Find the record that hasn't been clocked out yet
    });

    if (!existingRecord || !existingRecord?.clockInTime) {
      console.error("No active clock-in record found for user:", userId);
      return null;
    }

    // Calculate total hours: (clockOutTime - clockInTime) in hours
    const totalHours =
      (clockOutTime.getTime() - existingRecord?.clockInTime?.getTime()!) /
      3600000;

    existingRecord.clockInTime = undefined;
    existingRecord.clockOutTime = clockOutTime;
    existingRecord.totalHours = totalHours + (existingRecord.totalHours || 0);
    await existingRecord.save();

    console.log("Clock record updated:", existingRecord);
    return existingRecord;
  } catch (error) {
    console.error("Error updating clock record:", error);
    return null;
  }
}

export async function checkForExpiredClock() {
  try {
    console.log("Checking for expired clock records...");
    const clockRecords = await ClockRecordModel.find();
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.error("Guild not found.");
      return;
    }
    const members = await guild.members.fetch();
    for (const record of clockRecords) {
      if (members.get(record.userId)?.roles.cache.has("1379485478721552504")) {
        await handleIfExpiredClock(record.userId, "1379485478721552504");
      } else if (
        members.get(record.userId)?.roles.cache.has("1312607061015793714")
      ) {
        await handleIfExpiredClock(record.userId, "1312607061015793714");
      }
    }
    console.log("Expired clock check completed.");
  } catch (error) {
    console.error("Error checking for expired clock:", error);
  }
}

export async function handleIfExpiredClock(userId: string, roleId: string) {
  try {
    const user = await ClockRecordModel.findOne({ userId });
    if (!user) {
      console.error("No clock record found for user:", userId);
      return false;
    }

    const totalHours =
      (new Date().getTime() - user?.clockInTime?.getTime()!) / 3600000;

    const guild = client.guilds.cache.get(guildId);
    const discordUser = guild?.members.cache.get(userId);
    if (!discordUser) {
      console.error("Discord User not found in cache:", userId);
      return false;
    }

    if (discordUser.roles.cache.has(roleId)) {
      // Handle the case where the user has the specific role
      const timeLimit = ROLE_ID_TIME_LIMITS[roleId];
      if (totalHours > timeLimit) {
        console.log("User has exceeded time limit:", userId);
        user.clockInTime = undefined;
        user.clockOutTime = new Date();

        const clockChannels = await ClockChannelsModel.findOne();
        if (!clockChannels) {
          console.error("ClockChannels not found in database.");
          return false;
        }
        const adminChannel = guild?.channels.cache.get(
          clockChannels.adminChannelId
        );
        if (!adminChannel) {
          console.error("Admin channel not found in cache.");
          return false;
        }

        await (adminChannel as TextChannel).send({
          content: `⚠️ <@${userId}> has exceeded the time limit of ${timeLimit} hours, clock hours for today will be reset.`,
        });

        await user.save();
        console.log("Clock record reset today's hour for user:", userId);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error handling expired clock:", error);
    return false;
  }
}

export async function getCurrentTotalHours(userId: string) {
  try {
    const clockRecord = await ClockRecordModel.findOne({ userId });
    if (!clockRecord) {
      console.error("No clock record found for user:", userId);
      return null; // Return null if no record found
    }
    return clockRecord.totalHours || 0; // Return total hours or 0 if not set
  } catch (error) {
    console.error("Error getting current total hours:", error);
    return null; // Return null in case of error
  }
}

export async function exportRecordsToCSV() {
  try {
    const clockRecords = await ClockRecordModel.find();
    if (!clockRecords || clockRecords.length === 0) {
      console.error("No clock records found.");
      return null; // Return null if no records found
    }

    const csvRows = [];
    const headers = ["User ID", "Username", "Total Hours"];
    csvRows.push(headers.join(","));

    for (const record of clockRecords) {
      const decimal = ((record.totalHours || 0) % 1).toFixed(1);
      const roundOff = parseFloat(decimal) >= 0.5 ? true : false;
      const row = [
        record.userId,
        client.guilds.cache.get(guildId)?.members.cache.get(record.userId)?.user
          .username || "Unknown",
        record.totalHours
          ? roundOff
            ? Math.ceil(record.totalHours)
            : Math.floor(record.totalHours)
          : 0, // Ensure totalHours is a number
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");

    // Generate filename with today's date
    const today = new Date().toISOString().split("T")[0]; // Gets YYYY-MM-DD format
    const filename = `clock_records_${today}.csv`;

    // Create the full path to the csv folder
    const csvFolderPath = path.join(__dirname, "csv");
    const filePath = path.join(csvFolderPath, filename);

    // Ensure the csv directory exists
    if (!fs.existsSync(csvFolderPath)) {
      fs.mkdirSync(csvFolderPath, { recursive: true });
    }

    // Write the CSV content to file
    fs.writeFileSync(filePath, csvContent, "utf8");

    console.log(`CSV file exported successfully: ${filePath}`);

    return filePath; // Return the file path instead of content
  } catch (error) {
    console.error("Error exporting records to CSV:", error);
    return null; // Return null in case of error
  }
}

export async function initializeClockButtonsCollector() {
  try {
    console.log("Initializing clock buttons collector...");

    const clockChannels = await ClockChannelsModel.findOne();
    if (!clockChannels) {
      console.error("ClockChannels not found in database.");
      return false; // Return false if no clock channels found
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error("Guild not found in cache.");
      return false; // Return false if guild not found
    }

    // Get channels and fetch the interface messages
    const clockInChannel = guild.channels.cache.get(
      clockChannels.clockInChannelId
    ) as TextChannel;
    const clockOutChannel = guild.channels.cache.get(
      clockChannels.clockOutChannelId
    ) as TextChannel;

    if (!clockInChannel || !clockOutChannel) {
      console.error("Clock channels not found in cache.");
      return false;
    }

    // Fetch the interface messages instead of using cache
    const clockInInterface = await clockInChannel.messages
      .fetch(clockChannels.clockInInterfaceId)
      .catch(() => null);
    const clockOutInterface = await clockOutChannel.messages
      .fetch(clockChannels.clockOutInterfaceId)
      .catch(() => null);

    if (!clockInInterface || !clockOutInterface) {
      console.error("Clock interface messages not found in channels.");
      return false; // Return false if interfaces not found
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

      const isChatter = member.roles.cache.has(chatterRoleId);

      if (member.roles.cache.has(clockChannels.clockInRoleId)) {
        await interaction_button.reply({
          content: "You are already clocked in.",
          flags: "Ephemeral",
        });
        return;
      }

      await member.roles.add(clockChannels.clockInRoleId);
      await interaction_button.reply({
        embeds: [
          {
            color: 0x00ff00,
            title: "Clock In Successful",
            description: `<@${
              interaction_button.user.id
            }> has been clocked in. Failing to clock out within ${
              isChatter ? "12" : "16"
            } hours from now will result in an absent (Hours within the day of clock in won't be counted).`,
            footer: {
              text: "Time Tracking Bot",
              icon_url: interaction_button.guild.iconURL() || "",
            },
          },
        ],
        flags: "Ephemeral",
      });

      const adminChannel = interaction_button.guild?.channels.cache.get(
        clockChannels.adminChannelId
      ) as TextChannel;
      if (!adminChannel) {
        console.error("Admin channel not found.");
        return;
      }

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
          content: "You are not allowed to clock out.",
          flags: "Ephemeral",
        });
        return;
      }

      if (!member.roles.cache.has(clockChannels.clockInRoleId)) {
        await interaction_button.reply({
          content: "You are not clocked in.",
          flags: "Ephemeral",
        });
        return;
      }

      await member.roles.remove(clockChannels.clockInRoleId);
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

      const adminChannel = interaction_button.guild?.channels.cache.get(
        clockChannels.adminChannelId
      ) as TextChannel;
      if (!adminChannel) {
        console.error("Admin channel not found.");
        return;
      }

      await adminChannel.send({
        content: `🔴 <@${
          interaction_button.user.id
        }> has clocked out at <t:${Math.floor(Date.now() / 1000)}:F>`,
      });

      await clockOutRecord(interaction_button.user.id);
    });

    console.log("Clock buttons collector initialized successfully.");
    return true; // Return true if collector initialized successfully
  } catch (error) {
    console.error("Error initializing clock buttons collector:", error);
    return false; // Return false in case of error
  }
}
