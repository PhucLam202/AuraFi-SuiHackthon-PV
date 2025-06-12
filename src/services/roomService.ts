import Room from "../models/roomModel";
import { AIService } from "./aiService";
import { MessageRepository } from "../repository/MessageRepository";
import mongoose from "mongoose";
import { IMessage } from "../models/messageModels";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";
import User from "../models/userModel";
import { AppError } from "@middlewares/e/AppError";
import { StatusCodes } from "http-status-codes";

export class RoomService {
  private aiService: AIService;
  private messageRepository: MessageRepository;
  constructor() {
    this.aiService = new AIService();
    this.messageRepository = new MessageRepository();
  }
  async createRoom(userId: string, title: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw AppError.newError404(ErrorCode.USER_NOT_FOUND, "User not found");
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
    } catch (err) {
      console.log(err);
      if (!(err instanceof AppError)) {
        throw new AppError(
          `login error: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
          StatusCodes.INTERNAL_SERVER_ERROR,
          ErrorCode.LOGIN_FAILED,
          err instanceof Error ? err : undefined
        );
      }
      throw err;
    }
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
    try {
      const embeddings = await this.aiService.createEmbeddings(content);

      const message = await this.messageRepository.create({
        roomId: new mongoose.Types.ObjectId(roomId),
        role,
        content,
        embeddings,
      });

      await this.updateRoomContext(roomId, message);

      return message;
    } catch (err) {
      console.log(err);
      if (!(err instanceof AppError)) {
        throw new AppError(
          `login error: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
          StatusCodes.INTERNAL_SERVER_ERROR,
          ErrorCode.LOGIN_FAILED,
          err instanceof Error ? err : undefined
        );
      }
      throw err;
    }
  }

  private async updateRoomContext(roomId: string, newMessage: IMessage) {
    try {
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
    } catch (err) {
      console.log(err);
      if (!(err instanceof AppError)) {
        throw new AppError(
          `login error: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
          StatusCodes.INTERNAL_SERVER_ERROR,
          ErrorCode.LOGIN_FAILED,
          err instanceof Error ? err : undefined
        );
      }
      throw err;
    }
  }
  public async deleteRoom(roomId: string) {
    try {
      const room = await Room.findByIdAndDelete(roomId);
      if (!room) {
        throw AppError.newError404(ErrorCode.ROOM_NOT_FOUND, "Room not found");
      }
    } catch (err) {
      console.log(err);
      if (!(err instanceof AppError)) {
        throw new AppError(
          `login error: ${err instanceof Error ? err.message : "unknown error"}`,
          StatusCodes.INTERNAL_SERVER_ERROR,
          ErrorCode.LOGIN_FAILED,
          err instanceof Error ? err : undefined
        );
      }
      throw err;
    }
  }
  public async updateRoom(roomId: string, userId: string, updateData: Partial<{
    title: string;
    isActive: boolean;
    description: string;
  }>) {
    try {
      const room = await Room.findOne({
        _id: new mongoose.Types.ObjectId(roomId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!room) {
        throw AppError.newError404(ErrorCode.ROOM_NOT_FOUND, "Room not found or you don't have permission");
      }

      const updatedRoom = await Room.findByIdAndUpdate(
        roomId,
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!updatedRoom) {
        throw AppError.newError500(ErrorCode.ROOM_UPDATE_FAILED, "Failed to update room");
      }

      return updatedRoom;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(
        `Update room error: ${err instanceof Error ? err.message : "unknown error"}`,
        StatusCodes.INTERNAL_SERVER_ERROR,
        ErrorCode.ROOM_UPDATE_FAILED,
        err instanceof Error ? err : undefined
      );
    }
  }
}
