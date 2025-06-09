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

loginRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    loginController.getUser(req, res, next); 
});
loginRouter.patch('/updateUser', async (req: Request, res: Response, next: NextFunction) => {
    loginController.updateUser(req, res, next); 
});
loginRouter.delete('/deleteUser', async (req: Request, res: Response, next: NextFunction) => {
    loginController.deleteUser(req, res, next); 
});


export default loginRouter;