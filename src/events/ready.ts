import { Client, Events } from "discord.js";
import deployCommands from "../deploy-commands";
import { initializeClockButtonsCollector } from "../utils/ClockDB_management";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    if (!client.user) {
      console.log(client);
      console.log("client user not found");
      return;
    }

    deployCommands(client);
    await initializeClockButtonsCollector();

    console.log(`Logged in as ${client.user.tag}`);
  },
};
