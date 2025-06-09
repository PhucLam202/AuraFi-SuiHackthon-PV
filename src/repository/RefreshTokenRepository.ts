// repositories/RefreshTokenRepository.ts
import RefreshToken, { IRefreshToken } from '../models/refreshTokenModel';
import mongoose from 'mongoose';

export class RefreshTokenRepository {
  async create(tokenData: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const token = new RefreshToken(tokenData);
    return await token.save();
  }
  
  async findByToken(token: string): Promise<IRefreshToken | null> {
    return await RefreshToken.findOne({ 
      token, 
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).exec();
  }
  
  async revokeToken(token: string): Promise<void> {
    await RefreshToken.updateOne(
      { token },
      { isRevoked: true }
    ).exec();
  }
  
  async revokeAllUserTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId: new mongoose.Types.ObjectId(userId) },
      { isRevoked: true }
    ).exec();
  }
  
  async deleteExpiredTokens(): Promise<void> {
    await RefreshToken.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isRevoked: true }
      ]
    }).exec();
  }
}