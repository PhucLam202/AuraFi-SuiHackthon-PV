import express from 'express';
import ChatController from '@controllers/chatController';
import { Request, Response, NextFunction } from "express";

const chatRouter = express.Router();
const chatController = new ChatController();

// Đảm bảo middleware auth được áp dụng đúng cách
chatRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
    chatController.processMessage(req, res, next); 
});

export default chatRouter;