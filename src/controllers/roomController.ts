import { CustomExpress } from "@middlewares/app/customResponse";
import { Request, Response, NextFunction } from "express";
import { RoomService } from "../services/roomService"; 
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";



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
      const userId = req.headers['userid'] as string;
      console.log("userId", userId);
      const rooms = await this.roomService.getUserRooms(userId); 
      console.log("roomsController", rooms);
      if (rooms === null) {
          customResponse.response400(ErrorCode.ROOM_NOT_FOUND, {
            message: ErrorMessages[ErrorCode.ROOM_NOT_FOUND]
          }); 
      } else {
          customResponse.response200(rooms); 
      }

    } catch (error) {
      next(error);
    }
  }
  
  // Endpoint để lấy tin nhắn trong một room cụ thể
  // Bạn có thể cần route này hoặc không, tùy thuộc vào cách bạn cấu trúc API chat
  // Nếu API chat xử lý cả việc lấy lịch sử, thì có thể bỏ qua
  /*
  public async getRoomMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const roomId = req.params.roomId as string; // Lấy room id từ URL params
      const userId = req.headers.userId as string; // Đảm bảo người dùng có quyền truy cập room này (logic trong RoomService)

      // Bạn sẽ cần một phương thức trong RoomService để lấy tin nhắn theo RoomId
      // const messages = await this.roomService.getMessagesByRoom(roomId, userId);
      // customResponse.response200(messages);

       customResponse.response501("Not Implemented Yet"); // Tạm thời 501 nếu chưa implement
    } catch (error) {
      next(error);
    }
  }
  */
}

export default RoomController; 