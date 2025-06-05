import Room from "../models/roomModel";
import { AIService } from "./aiService";
import { MessageRepository } from "../repository/MessageRepository";
import mongoose from "mongoose";
import { IMessage } from "../models/messageModels";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";
import User from "../models/userModel";

export class RoomService {
  private aiService: AIService;
  private messageRepository: MessageRepository;
  constructor() {
    this.aiService = new AIService();
    this.messageRepository = new MessageRepository();
  }
  async createRoom(userId: string, title: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(ErrorMessages[ErrorCode.USER_NOT_FOUND]);
    }
    const room = await Room.create({
      userId,
      title,
      isActive: true,
      context: {
        summary: "",
        keywords: [],
        userPreferences: {},
        conversationStyle: "friendly",
      },
    });

    return room;
  }

  async getUserAllRooms(userId: string) {
    return await Room.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).select("-messages");
  }

  async getRoomById(roomId: string, userId: string) {
    return await Room.findById(roomId).populate({
      path: "messages",
      options: { sort: { createdAt: -1 }, limit: 10 },
    });
  }

  async addMessage(roomId: string, role: string, content: string) {
    const room = await Room.findById(roomId);
    if (!room) {
      throw new Error(ErrorMessages[ErrorCode.ROOM_NOT_FOUND]);
    }

    const embeddings = await this.aiService.createEmbeddings(content);

    const message = await this.messageRepository.create({
      roomId: new mongoose.Types.ObjectId(roomId),
      role,
      content,
      embeddings,
    });

    await this.updateRoomContext(roomId, message);

    return message;
  }

  private async updateRoomContext(roomId: string, newMessage: IMessage) {
    const recentMessages = await this.messageRepository.findRecentByRoom(
      roomId,
      10
    );

    const analysis = await this.aiService.generateAIResponse(
      recentMessages.map((message) => message.content).join("\n")
    );

    await Room.findByIdAndUpdate(roomId, {
      context: {
        summary: analysis,
        keywords: [],
        userPreferences: {},
      },
    });
  }

}
