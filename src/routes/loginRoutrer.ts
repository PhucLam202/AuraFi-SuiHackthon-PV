import express from 'express';
import LoginController from '@controllers/loginController';
import { Request, Response, NextFunction } from "express";
import { authenticateToken } from '@middlewares/auth';

const loginRouter = express.Router();
const loginController = new LoginController();

// Đảm bảo middleware auth được áp dụng đúng cách
loginRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    loginController.register(req, res, next); 
});

loginRouter.post('/loginWithSui', async (req: Request, res: Response, next: NextFunction) => {
    loginController.loginWithSui(req, res, next); 
});

loginRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    loginController.login(req, res, next); 
});

loginRouter.use(authenticateToken as any);


export default loginRouter;