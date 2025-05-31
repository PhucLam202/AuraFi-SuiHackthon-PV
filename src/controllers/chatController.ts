import { CustomExpress } from "@middlewares/app/customResponse";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { Request, Response, NextFunction } from "express";
import ChatService from "@services/chatService";

class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  public async processMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const appExpress = new CustomExpress(req, res, next);
      const walletAddress = req.headers.walletaddress as string;
      const message = req.body.message;
      const response = await this.chatService.processMessage(walletAddress, message);
      appExpress.response200({ message: response });
    } catch (error) {
      next(error); 
    }
  }
}
export default ChatController;
