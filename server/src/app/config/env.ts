import dotenv from "dotenv";
dotenv.config();

// Throw error if required environment variables are missing
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in environment variables');
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET is required in environment variables');
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/hrm";
export const PORT = process.env.PORT || 5000;
