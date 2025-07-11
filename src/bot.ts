import { Client, Collection, GatewayIntentBits } from "discord.js";
import loadCommands from "./loadCommands";
import loadEvents from "./loadEvents";

export interface CustomClient extends Client {
  commands: Collection<string, any>;
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as CustomClient;

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

export const startBot = async () => {
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log("Bot is online!");
  } catch (error) {
    console.error("Error logging in:", error);
  }
};

setTimeout(() => {
  if (!client.isReady()) {
    console.error("Bot failed to start within the expected time.");
    startBot();
  }
}, 30000);

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
