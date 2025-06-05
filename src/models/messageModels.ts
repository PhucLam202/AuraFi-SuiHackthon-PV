import { Schema, model, Document, Types } from 'mongoose';


  export interface IMessage extends Document {
    roomId: Types.ObjectId;
    role: string;
    content: string;
    embeddings: number[];
    createdAt: Date;
    updatedAt: Date;
    userId?: Types.ObjectId;
  }

  const MessageSchema = new Schema<IMessage>(
    {
      roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
      },
      role: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      embeddings: {
        type: [Number],
        required: true,
        select: false, 
      },    
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
      }
    },
    { timestamps: true }
  );
  


const Message = model<IMessage>('Message', MessageSchema);

export default Message;