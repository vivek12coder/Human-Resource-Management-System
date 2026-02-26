import mongoose from "mongoose";
import { config } from "./index";

export const connectDB = async () => {
  try {
    await mongoose.connect(config.database_url);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("Database Connection Failed:", error);
    process.exit(1);
  }
};
