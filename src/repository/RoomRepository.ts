import mongoose from "mongoose";
import Room, { IRoom } from "../models/roomModel";

export class RoomRepository {
  async create(roomData: Partial<IRoom>): Promise<IRoom> {
    const room = new Room(roomData);
    return await room.save();
  }

  async findById(id: string): Promise<IRoom | null> {
    return await Room.findById(id).exec();
  }
  async findByIdAndUpdate(roomId: string, updateData: Partial<IRoom>): Promise<IRoom | null> {
    return await Room.findByIdAndUpdate(roomId, updateData, { new: true }).exec();
  }

  async findByRoomId(
    roomId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<IRoom[]> {
    const { limit = 50, skip = 0 } = options;

    return await Room.find({ roomId: new mongoose.Types.ObjectId(roomId) })
      .sort({ createdAt: 1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async findRecentByRoom(roomId: string, limit: number = 10): Promise<IRoom[]> {
    return await Room.find({ roomId: new mongoose.Types.ObjectId(roomId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Vector similarity search (MongoDB Atlas Vector Search)
  async findSimilar(
    roomId: string,
    queryEmbedding: number[],
    limit: number = 5
  ): Promise<IRoom[]> {
    // Note: Requires MongoDB Atlas với Vector Search setup
    return await Room.aggregate([
      {
        $vectorSearch: {
          index: "message_embeddings_index",
          path: "embeddings",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit,
          filter: {
            roomId: new mongoose.Types.ObjectId(roomId),
          },
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
  }

  async updateEmbeddings(roomId: string, embeddings: number[]): Promise<void> {
    await Room.findByIdAndUpdate(roomId, { embeddings }).exec();
  }

  async deleteByRoomId(roomId: string): Promise<void> {
    await Room.deleteMany({
      roomId: new mongoose.Types.ObjectId(roomId),
    }).exec();
  }

  async getRoomCount(roomId: string): Promise<number> {
    return await Room.countDocuments({
      roomId: new mongoose.Types.ObjectId(roomId),
    });
  }
}
