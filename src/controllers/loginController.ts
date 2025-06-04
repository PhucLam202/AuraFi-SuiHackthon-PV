import { CustomExpress } from "@middlewares/app/customResponse";
import { Request, Response, NextFunction } from "express";
import { AuthService } from "@services/authService";


class LoginController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }
  public async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const email = req.body.email;
      const password = req.body.password;

      const responseMessage = await this.authService.register(email, password);

      customResponse.response200(responseMessage);
    } catch (error) {
      next(error);
    }
  }
  public async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const email = req.body.email;
      const password = req.body.password;
      const responseMessage = await this.authService.login(email, password);

      customResponse.response200(responseMessage);
    } catch (error) {
      next(error);
    }
  }

  public async loginWithSui(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next);
      const suiAddress = req.headers.suiaddress as string;
      const responseMessage = await this.authService.loginWithSui(suiAddress);

      customResponse.response200(responseMessage);
    } catch (error) {
      next(error);
    }
  }
  public async updateUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const customResponse = new CustomExpress(req, res, next); 
      const data = req.body;     
      const userId = req.headers.userId as string;
      const responseMessage = await this.authService.updateUser(userId, data);

      customResponse.response200(responseMessage);
    } catch (error) {
      next(error);
    }
  }
}
export default LoginController;
