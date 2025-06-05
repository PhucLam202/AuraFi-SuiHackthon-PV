import { Message } from "../types/model/messageModel";
import { RoomContext } from "../types/model/roomContextModel";
import { Schema, model, Document, Types } from "mongoose";

export interface IRoom extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  context: RoomContext;
}

const RoomSchema = new Schema<IRoom>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    messages: [{
      type: Schema.Types.ObjectId,
      ref: 'Message',
    }],
    context: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Room = model<IRoom>("Room", RoomSchema);

export default Room;
