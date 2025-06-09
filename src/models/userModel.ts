import { Schema, model, Document, Types } from 'mongoose';


  export interface IUser extends Document {
    email: string;
    password: string;
    name?: string;
    avatar?: string;
    suiAddress?: string;
    authType: 'email' | 'wallet';
    paymentPlan?: IPaymentPlan;
    isActive: boolean;
    isDeleted: boolean;
    role?: IRole;
    refreshTokens?: Types.ObjectId[]; 
    rooms?: Types.ObjectId[]; 
    createdAt: Date;
    updatedAt: Date;
  }
interface IPaymentPlan {
  type: 'free'| 'basic' | 'premium';
  startDate?: Date;
  endDate?: Date;
}
interface IRole {
  type: 'admin' | 'user';
  startDate?: Date;
  endDate?: Date;
}
  const UserSchema = new Schema<IUser>(
    {
      email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        required: true,
      },
      password: {
        type: String,
        select: false,
        required: true,
      },
      name: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
      },
      suiAddress: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
      },
      authType: {
        type: String,
        enum: ['email', 'wallet'],
        required: true,
      },
      paymentPlan: {
        type: Object,
        default: {
          type: 'free',
        },
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
      role: {
        type: {
          type: String,
          enum: ['admin', 'user'],
          required: true,
          default: 'user',
        },
        startDate: {
          type: Date,
        },
        endDate: {
          type: Date,
        },
      },
      refreshTokens: [
        {
          type: Schema.Types.ObjectId,
          ref: 'RefreshToken',
        },
      ],
      rooms: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Room',
        },
      ],
    },
    { timestamps: true }
  );
  


const User = model<IUser>('User', UserSchema);

export default User;