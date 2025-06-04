import { CustomExpress } from "@middlewares/app/customResponse";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { Request, Response, NextFunction } from "express";
import ChatService from "@services/chatService";
import { RoomService } from "@services/roomService";
class ChatController {
  private chatService: ChatService;
  private roomService: RoomService;
  constructor() {
    this.chatService = new ChatService();
    this.roomService = new RoomService();
  }

  // public async processMessage(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> {
  //   try {
  //     const customResponse = new CustomExpress(req, res, next);
  //     const walletAddress = req.headers.walletaddress as string;
  //     const message = req.body.message;
  //     const responseMessage = await this.chatService.processMessage(walletAddress, message);

  //     customResponse.response200(responseMessage);
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  public async processMessageInRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);

      //get data of user form body and headers (userId, walletAddress, messageContent)
      const roomId = req.params.roomId as string; 
      const userId = req.headers['userid'] as string; 
      const walletAddress = req.headers.walletaddress as string;
      const { messageContent } = req.body; 
      const responseMessage = await this.chatService.processMessage(walletAddress, messageContent, roomId, userId);

      if (!roomId || !userId || !messageContent) {
        customResponse.response400(ErrorCode.BAD_REQUEST, {
          message: "Missing roomId, userId, or messageContent"
        });
        return;
      }
      // Gửi phản hồi của AI về client
      customResponse.response200(responseMessage);

    } catch (error) {
      console.error("Error processing message in room:", error);
      next(error); 
    }
  }
}
export default ChatController;
