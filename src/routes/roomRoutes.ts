import express from 'express';
import RoomController from '../controllers/roomController';
import { authenticateToken } from '@middlewares/auth'; 
import { Request, Response, NextFunction } from "express";
import ChatController from '@controllers/chatController';

const router = express.Router();
const roomController = new RoomController(); 

router.use(authenticateToken as any);

router.post('/',async (req: Request, res: Response, next: NextFunction) => {
  roomController.createRoom(req, res, next);
});
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  roomController.getUserRooms(req, res, next);
});
router.get('/:roomId', async (req: Request, res: Response, next: NextFunction) => {
  roomController.getRoomById(req, res, next);
});
router.post('/:roomId/messages', async (req: Request, res: Response, next: NextFunction) => {
    const chatController = new ChatController();
    chatController.processMessageInRoom(req, res, next);
});
router.delete('/:roomId', async (req: Request, res: Response, next: NextFunction) => {
  roomController.deleteRoom(req, res, next);
});
router.put('/:roomId', async (req: Request, res: Response, next: NextFunction) => {
  roomController.updateRoom(req, res, next);
});

export default router; 