import express, { type Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { registerRoutes } from "src/routes/index";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "@configs/db";
import mongoose from "mongoose";
import { AppError } from "@middlewares/e/AppError";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json(), (req, res, next) => {
  console.log("Body parsed:", req.body);
  next();
});
app.use(express.urlencoded({ extended: false }));

// Register routes
registerRoutes(app);

// Global error handler (không dùng app.use, đặt sau tất cả route)
app.use(((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.log("Error caught in middleware:", err); // Logging để debug
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      msg: err.msg,
      errCode: err.errCode,
      statusCode: err.statusCode,
      root: err.root ? err.root.message : undefined,
    });
  }

  // Xử lý các lỗi khác (không phải AppError)
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Unhandled error:", err);
  res.status(status).json({ msg: message, errCode: status });
}) as ErrorRequestHandler);

const port = process.env.PORT || 5000;

mongoose.set("bufferCommands", false);

const startServer = async () => {
  try {
    await connectDB();

    app.listen(Number(port), () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
