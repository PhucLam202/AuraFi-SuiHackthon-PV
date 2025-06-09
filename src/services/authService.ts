import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@middlewares/e/AppError";
import User from "../models/userModel";
import dotenv from "dotenv";
import { User as UserType } from "../types/model/userModel";

dotenv.config();
export class AuthService {
  private JWT_SECRET = process.env.JWT_SECRET!;

  async register(email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const isUser = await User.findOne({ email });
    if (isUser) {
      throw new Error(ErrorMessages[ErrorCode.USER_ALREADY_EXISTS]);
    }

    const user = await User.create({
      email,
      password: hashedPassword,
      authType: "email",
      isActive: true,
      isDeleted: false,
      role: {
        type: "user",
        startDate: new Date(),
        endDate: new Date(),
      },
    });
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      this.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email }).select("+password");
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new Error(ErrorMessages[ErrorCode.INVALID_CREDENTIALS]);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error(ErrorMessages[ErrorCode.INVALID_CREDENTIALS]);
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      this.JWT_SECRET,
      { expiresIn: "1d" }
    );
    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        authType: user.authType,
        avatar: user.avatar,
        paymentPlan: user.paymentPlan,
        isActive: user.isActive,
        role: user.role,
      },
      token,
    };
  }

  // NEW: Sui Wallet Authentication
  async loginWithSui(suiAddress: string) {
    try {
      // Check if user exists
      let user = await User.findOne({ suiAddress });

      if (!user) {
        user = await User.create({
          suiAddress: suiAddress,
          name: `User ${suiAddress.slice(0, 6)}...${suiAddress.slice(-4)}`,
          authType: "wallet",
          isActive: true,
          isDeleted: false,
          role: {
            type: "user",
            startDate: new Date(),
            endDate: new Date(),
          },
        });
      }

      const token = jwt.sign(
        { suiAddress: user.suiAddress, userId: user._id },
        this.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return {
        user: {
          id: user._id,
          email: user.email,
          suiAddress: user.suiAddress,
          name: user.name,
          authType: user.authType,
          avatar: user.avatar,
          paymentPlan: user.paymentPlan,
          isActive: user.isActive,
          role: user.role,
        },
        token: token,
      };
    } catch (error) {
      console.log(error);
      throw new Error(ErrorMessages[ErrorCode.WALLET_AUTHENTICATION_FAILED]);
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<UserType>
  ): Promise<UserType> {
    const user = await User.findById(userId).select("+password");
    if (user?.isDeleted === true) {
      throw new Error(ErrorMessages[ErrorCode.USER_DELETED]);
    }
    if (!user) {
      throw new Error(ErrorMessages[ErrorCode.USER_NOT_FOUND]);
    }

    if (updates.password) {
      user.password = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }

    Object.assign(user, updates);

    await user.save();

    return user.toObject() as unknown as UserType;
  }

  async delete(userId: string) {
    const result = await User.findByIdAndUpdate(userId, { isDeleted: true }, { new: true });
    if (!result) {
      throw new Error(ErrorMessages[ErrorCode.USER_NOT_FOUND]);
    }
    return { message: "User marked as deleted successfully" };
  }

  async getUser(userId: string) {
    const user = await User.findById(userId);
    if (user?.isDeleted === true) {
      throw new Error(ErrorMessages[ErrorCode.USER_DELETED]);
    }
    try {
      if (!user) {
        throw new AppError(
          ErrorMessages[ErrorCode.USER_NOT_FOUND],
          StatusCodes.NOT_FOUND,
          ErrorCode.USER_NOT_FOUND
        );
      }
      return user.toJSON();
    } catch (error) {
      console.log(error);
      throw new Error(ErrorMessages[ErrorCode.USER_NOT_FOUND]);
    }
  }
}
