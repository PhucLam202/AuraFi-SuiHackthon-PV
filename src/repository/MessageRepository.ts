import mongoose from "mongoose";
import Message, { IMessage } from "../models/messageModels";

export class MessageRepository {
    async create(messageData: Partial<IMessage>): Promise<IMessage> {
      const message = new Message(messageData);
      return await message.save();
    }
    
    async findById(id: string): Promise<IMessage | null> {
      return await Message.findById(id).exec();
    }
    
    async findByRoomId(roomId: string, options: { limit?: number; skip?: number } = {}): Promise<IMessage[]> {
      const { limit = 50, skip = 0 } = options;
      
      return await Message.find({ roomId: new mongoose.Types.ObjectId(roomId) })
        .sort({ createdAt: 1 })
        .limit(limit)
        .skip(skip)
        .exec();
    }
    
    async findRecentByRoom(roomId: string, limit: number = 10): Promise<IMessage[]> {
      return await Message.find({ roomId: new mongoose.Types.ObjectId(roomId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
    }
    
    // Vector similarity search (MongoDB Atlas Vector Search)
    async findSimilar(roomId: string, queryEmbedding: number[], limit: number = 5): Promise<IMessage[]> {
      // Note: Requires MongoDB Atlas với Vector Search setup
      return await Message.aggregate([
        {
          $vectorSearch: {
            index: 'message_embeddings_index',
            path: 'embeddings',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: limit,
            filter: {
              roomId: new mongoose.Types.ObjectId(roomId)
            }
          }
        },
        {
          $addFields: {
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ]);
    }
    
    async updateEmbeddings(messageId: string, embeddings: number[]): Promise<void> {
      await Message.findByIdAndUpdate(messageId, { embeddings }).exec();
    }
    
    async deleteByRoomId(roomId: string): Promise<void> {
      await Message.deleteMany({ roomId: new mongoose.Types.ObjectId(roomId) }).exec();
    }
    
    async getMessageCount(roomId: string): Promise<number> {
      return await Message.countDocuments({ roomId: new mongoose.Types.ObjectId(roomId) });
    }
  }