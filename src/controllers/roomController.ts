import { CustomExpress } from "@middlewares/app/customResponse";
import { Request, Response, NextFunction } from "express";
import { RoomService } from "../services/roomService"; 
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";
import mongoose from "mongoose";



class RoomController {
  private roomService: RoomService;

  constructor() {
    this.roomService = new RoomService(); 
  }

  public async createRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const userId = req.headers['userid'] as string;
      console.log("userId", userId);
      if (!req.body || !req.body.title) {
        customResponse.response400(ErrorCode.ROOM_TITLE_REQUIRED, {
          title: ErrorMessages[ErrorCode.ROOM_TITLE_REQUIRED]
        });
        return; 
      }

      const { title } = req.body;
      console.log("title", title);
      const newRoom = await this.roomService.createRoom(userId, title);
      console.log("newRoom", newRoom);
      if(newRoom){
        customResponse.response200(newRoom); 
      }else{
        customResponse.response400(ErrorCode.ROOM_CREATION_FAILED, {
          title: ErrorMessages[ErrorCode.ROOM_CREATION_FAILED]
        });
      }

    } catch (error) {
      next(error);
    }
  }

  // Endpoint để lấy tất cả room của một người dùng
  public async getUserRooms(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const userId = req.headers.userid as string;

      const rooms = await this.roomService.getUserAllRooms(userId);
      if (rooms.length === 0) {
        customResponse.response404(ErrorCode.ROOM_NOT_FOUND, {
          message: ErrorMessages[ErrorCode.ROOM_NOT_FOUND]
        }); 
        return;
      } else {
        customResponse.response200(rooms); 
      }
    } catch (error) {
      next(error);
    }
  }
  
  public async getRoomById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const roomId = req.params.roomId as string; 
      const userId = req.headers['userid'] as string; 
      if (!roomId || !userId) {
        customResponse.response400(ErrorCode.BAD_REQUEST, {
          message: "Missing roomId or userId" 
        });
        return;
      }
      const room = await this.roomService.getRoomById(roomId, userId);
      if (room === null) {
        customResponse.response404(ErrorCode.ROOM_NOT_FOUND, { 
          message: ErrorMessages[ErrorCode.ROOM_NOT_FOUND]
        });
      } else {
        customResponse.response200(room); 
      }
    } catch (error) {
      next(error);
    }
  }
    public async deleteRoom(
      req: Request,
      res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const roomId = req.params.roomId as string;
      const userId = req.headers['userid'] as string;
      if (!roomId || !userId) {
        customResponse.response400(ErrorCode.BAD_REQUEST, {
          message: "Missing roomId or userId" 
        });
        return;
      }
      const result = await this.roomService.deleteRoom(roomId);
      customResponse.response200({
        message: "Room deleted successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}

export default RoomController; 