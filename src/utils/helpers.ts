import "dotenv/config";
import { exportRecordsToCSV } from "./ClockDB_management";
import ClockChannelsModel from "../models/ClockChannels.model";
import { client } from "../bot";
import { AttachmentBuilder, TextChannel } from "discord.js";
import * as fs from "fs";
import ClockRecordModel from "../models/ClockRecord.model";

const SERVER_LINK = process.env.SERVER_LINK;
let timeoutId: NodeJS.Timeout;

export const pingBot = () => {
  if (!SERVER_LINK) return;

  const attemptPing = () => {
    fetch(SERVER_LINK)
      .then((res) => res.text())
      .then((text) => console.log(`Ping successful: ${text}`))
      .catch((err) => {
        clearTimeout(timeoutId);
        console.log(`Ping failed, retrying: ${err}`);
        timeoutId = setTimeout(attemptPing, 5000);
      });
  };

  attemptPing();
};

export const exportEveryweekToCSV = () => {
  const scheduleNextExport = () => {
    const now = new Date();

    // Convert to UTC+8 (Singapore/Manila timezone)
    const utc8Now = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    // Get next Wednesday at 6 AM UTC+8
    const nextWednesday = new Date(utc8Now);

    // Calculate days until next Wednesday (3 = Wednesday, 0 = Sunday)
    const daysUntilWednesday = (3 - utc8Now.getDay() + 7) % 7;

    // If today is Wednesday but past 6 AM, schedule for next week
    if (daysUntilWednesday === 0 && utc8Now.getHours() >= 6) {
      nextWednesday.setDate(utc8Now.getDate() + 7);
    } else {
      nextWednesday.setDate(utc8Now.getDate() + daysUntilWednesday);
    }

    // Set to 6 AM
    nextWednesday.setHours(6, 0, 0, 0);

    // Convert back to UTC for setTimeout
    const nextWednesdayUTC = new Date(
      nextWednesday.getTime() - 8 * 60 * 60 * 1000
    );
    const timeUntilExport = nextWednesdayUTC.getTime() - now.getTime();

    console.log(
      `Next CSV export scheduled for: ${nextWednesday.toISOString()} UTC+8`
    );
    console.log(
      `Time until export: ${Math.round(timeUntilExport / 1000 / 60 / 60)} hours`
    );

    setTimeout(async () => {
      try {
        console.log("🗓️ Weekly CSV export starting...");
        const filePath = await exportRecordsToCSV();

        if (filePath) {
          console.log(`✅ Weekly CSV export completed: ${filePath}`);
          const clockChannels = await ClockChannelsModel.findOne();
          if (!clockChannels) {
            console.error("Clock channels not found in the database.");
            return;
          }

          const guild = client.guilds.cache.get(
            process.env.GUILD_ID || "1312604320650235945"
          );
          if (!guild) {
            console.error("Guild not found in the cache.");
            return;
          }

          const adminChannel = (await guild.channels.fetch(
            clockChannels.adminChannelId
          )) as TextChannel;
          if (!adminChannel) {
            console.error("Admin channel not found or not text-based.");
            return;
          }

          const result = await ClockRecordModel.updateMany(
            {}, // Match all records
            { $set: { totalHours: 0 } } // Reset totalHours to 0
          );
          if (result.modifiedCount === 0) {
            console.warn("No records were updated to reset totalHours.");
          } else {
            console.log(
              `Total hours reset for ${result.modifiedCount} records.`
            );
          }

          // Delete records for users who are not currently clocked in
          const cleanUpResult = await ClockRecordModel.deleteMany({
            clockOutTime: { $exists: false },
            clockInTime: { $exists: true },
          });

          if (cleanUpResult.deletedCount > 0) {
            console.log(
              `Cleaned up ${cleanUpResult.deletedCount} completed clock-in records.`
            );
          } else {
            console.log("No completed clock-in records found to clean up.");
          }

          const attachment = new AttachmentBuilder(filePath);

          await adminChannel.send({
            content: `📊 Weekly clock records exported successfully! Here is the file:`,
            files: [attachment],
          });

          // Delete the file after uploading
          try {
            fs.unlinkSync(filePath);
            console.log(`CSV file deleted after upload: ${filePath}`);
          } catch (deleteError) {
            console.error("Error deleting CSV file:", deleteError);
          }
        } else {
          console.log("❌ Weekly CSV export failed");
        }
      } catch (error) {
        console.error("Error during weekly CSV export:", error);
      }

      // Schedule the next export
      scheduleNextExport();
    }, timeUntilExport);
  };

  // Start the scheduling
  scheduleNextExport();
  console.log("📅 Weekly CSV export scheduler initialized");
};
