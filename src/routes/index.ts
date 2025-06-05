import type { Express } from "express";
import { createServer, type Server } from "http";
import chatRouter from "./chatRouter";
import loginRouter from "./loginRoutrer";
import roomRouter from "./roomRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes
  app.use("/v1/chat", chatRouter);
  app.use("/v1/auth", loginRouter);
  app.use("/v1/room", roomRouter);
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  
  const httpServer = createServer(app);
  return httpServer;
}