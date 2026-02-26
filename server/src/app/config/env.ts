import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "supersecretrefresh";
export const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/hrm";
export const PORT = process.env.PORT || 5000;
