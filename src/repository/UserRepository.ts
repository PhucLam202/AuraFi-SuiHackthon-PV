import User, { IUser } from '../models/userModel';
import bcrypt from 'bcryptjs';

export class UserRepository {
  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }
  
  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id).exec();
  }
  
  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email: email.toLowerCase() }).exec();
  }
  
  async findBySuiAddress(suiAddress: string): Promise<IUser | null> {
    return await User.findOne({ suiAddress: suiAddress.toLowerCase() }).exec();
  }
  
  async updateById(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }
  
  async deleteById(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id).exec();
    return !!result;
  }
}

