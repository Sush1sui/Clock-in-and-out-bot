import mongoose, { Document, Model } from "mongoose";

export interface ClockRecordType {
  userId: string; // Discord user ID
  clockInTime?: Date; // Time when the user clocked in
  clockOutTime?: Date; // Time when the user clocked out, optional
  totalHours?: number; // Total hours worked, optional
}

export interface ClockRecordDocument extends ClockRecordType, Document {}
export interface ClockRecordModel extends Model<ClockRecordDocument> {}

const clockRecordSchema = new mongoose.Schema<ClockRecordDocument>(
  {
    userId: { type: String, required: true },
    clockInTime: { type: Date, default: undefined },
    clockOutTime: { type: Date, default: undefined },
    totalHours: { type: Number, default: undefined },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

export default mongoose.model<ClockRecordDocument, ClockRecordModel>(
  "ClockRecord",
  clockRecordSchema
);
