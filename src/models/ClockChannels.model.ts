import mongoose, { Document, Model } from "mongoose";

export interface ClockChannelsType {
  categoryId: string; // ID of the category channel
  clockInChannelId: string; // ID of the clock-in channel
  clockInInterfaceId: string; // ID of the clock-in interface message
  clockOutChannelId: string; // ID of the clock-out channel
  clockOutInterfaceId: string; // ID of the clock-out interface message
  adminChannelId: string; // ID of the admin channel
  clockInRoleId: string;
}

export interface ClockChannelsDocument extends ClockChannelsType, Document {}
export interface ClockChannelsModel extends Model<ClockChannelsDocument> {}

const clockChannelsSchema = new mongoose.Schema<ClockChannelsDocument>({
  categoryId: { type: String, required: true },
  clockInChannelId: { type: String, required: true },
  clockInInterfaceId: { type: String, required: true },
  clockOutChannelId: { type: String, required: true },
  clockOutInterfaceId: { type: String, required: true },
  adminChannelId: { type: String, required: true },
  clockInRoleId: { type: String, required: true },
});

export default mongoose.model<ClockChannelsDocument>(
  "ClockChannels",
  clockChannelsSchema
);
