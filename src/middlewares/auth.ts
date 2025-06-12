import { JwtPayload } from "jsonwebtoken";

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repository/UserRepository';
import { IUser } from "src/models/userModel";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";
import dotenv from 'dotenv';
dotenv.config();

// Create a single instance of UserRepository to reuse
const userRepository = new UserRepository();

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: ErrorMessages[ErrorCode.ACCESS_TOKEN_REQUIRED] });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await userRepository.findById(decoded.userId.toString()) as IUser;
      
      if (!user) {
        return res.status(401).json({ error: ErrorMessages[ErrorCode.USER_NOT_FOUND] });
      }
      
      (req as any).user = user;
      (req as any).userId = decoded.userId;

      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  };