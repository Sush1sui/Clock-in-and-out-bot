import "dotenv/config";
import express from "express";
import "./bot";
import mongoose from "mongoose";
import { pingBot } from "./utils/helpers";
import { checkForExpiredClock } from "./utils/ClockDB_management";
const PORT = process.env.PORT || 7669;

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("No database connection string");
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((e) => console.log(e));

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  console.log("Clock In/Out Bot is running!");
  res.send("Clock In/Out Bot is running!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

pingBot();
setTimeout(() => {
  checkForExpiredClock();
}, 30000);
setInterval(pingBot, 600000); // Ping every 10 minutes
setInterval(checkForExpiredClock, 1200000); // Check every 20 minutes
