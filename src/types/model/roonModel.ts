// Room Model (Chat Sessions)
import { Message } from "./messageModel";
import { RoomContext } from "./roomContextModel";

export  interface Room {
    id: string;
    userId: string;
    title: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    messages: Message[];
    context: RoomContext;
  }