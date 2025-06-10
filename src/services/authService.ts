import * as jwt from "jsonwebtoken";
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
  private JWT_SECRET: string;
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET as string;
  }
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

  public async login(email: string, password: string): Promise<any> {
    console.log("Attempting login for email:", email);
  
    try {
      const user = await User.findOne({ email }).select("+password");
      console.log("User found:", user); // Debug
  
      if (!user) {
        throw new AppError(
          ErrorMessages[ErrorCode.USER_NOT_FOUND],
          StatusCodes.UNAUTHORIZED,
          ErrorCode.USER_NOT_FOUND
        );
      }
  
      if (user.authType === "wallet") {
        let message = `This account is registered with a wallet. Please login with your Sui wallet.`;
        if (user.suiAddress) {
          message += ` Linked wallet address: ${user.suiAddress}`;
        }
        throw AppError.newError400(ErrorCode.AUTH_TYPE_MISMATCH, message);
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password as string);
      console.log("Password match:", passwordMatch); // Debug
      if (!passwordMatch) {
        throw AppError.newError400(
          ErrorCode.INVALID_CREDENTIALS,
          "Invalid credentials"
        );
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
    } catch (err) {
      console.error("Error in login:", err);
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
    const result = await User.findByIdAndUpdate(
      userId,
      { isDeleted: true },
      { new: true }
    );
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
