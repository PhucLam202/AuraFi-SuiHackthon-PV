import { Schema, model, Document, Types } from 'mongoose';

export interface IRoomContext extends Document {
    roomId: Types.ObjectId;
    summary: string;
    keywords: string[];
    userPreferences: Record<string, any>;
    conversationStyle: string;
    lastUpdated: Date;
}

const RoomContextSchema = new Schema<IRoomContext>({
    roomId: {
        type: Schema.Types.ObjectId, 
        ref: 'Room',
        required: true,
    },
    summary: {
        type: String,
        required: true,
    },
    keywords: {
        type: [String],
        required: true,
    },
    userPreferences: {
        type: Object,
        required: true,
    },
    conversationStyle: {
        type: String,
        required: true,
    },
    lastUpdated: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true, 
});

const RoomContext = model<IRoomContext>('RoomContext', RoomContextSchema);

export default RoomContext; 