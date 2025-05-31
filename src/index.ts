import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from '@routers/index';
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "@configs/db";
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(err);
  res.status(status).json({ message });
});

// Server configuration
const port = process.env.PORT || 5000;

// Disable Mongoose buffering to see errors immediately
mongoose.set('bufferCommands', false);

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Only register routes AFTER successful DB connection
    registerRoutes(app);
    
    // Start the server
    app.listen(Number(port), () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();