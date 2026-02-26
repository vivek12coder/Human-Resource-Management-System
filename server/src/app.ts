import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./app/routes";
import AppError from "./app/errors/AppError";

const app = express();

/* ============================= */
/*         MIDDLEWARE            */
/* ============================= */

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// CORS Configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173", "*"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Cookie Parser
app.use(cookieParser());

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ============================= */
/*          ROUTES               */
/* ============================= */

// Welcome Route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Welcome to HRM Admin Panel API 🚀",
    version: "1.0.0",
    documentation: "/api/health",
  });
});

// API Routes
app.use("/api", router);

/* ============================= */
/*       404 HANDLER             */
/* ============================= */

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    error: "The requested endpoint does not exist",
  });
});

/* ============================= */
/*     GLOBAL ERROR HANDLER      */
/* ============================= */

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Log error for debugging
  console.error("Error:", err);

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.errorMessage,
    });
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: messages,
    });
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: "Duplicate Entry",
      error: `${field} already exists`,
    });
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID",
      error: "The provided ID is not valid",
    });
  }

  // Handle JWT Errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid Token",
      error: "Your session is invalid. Please login again.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token Expired",
      error: "Your session has expired. Please login again.",
    });
  }

  // Default Error Response
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : "Something went wrong",
  });
});

export default app;
