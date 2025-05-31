import type { Express } from "express";
import { createServer, type Server } from "http";
import chatRouter from "./chatRouter";
export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes
  app.use("/v1/chat", chatRouter);
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  
  const httpServer = createServer(app);
  return httpServer;
}