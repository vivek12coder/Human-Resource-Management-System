import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app";

dotenv.config();
async function main() {
  try {
    // MongoDB connect
    const dbUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/hrm";
    await mongoose.connect(dbUrl);
    console.log("MongoDB Connected Successfully");

    // Start Express server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server or DB connection error:", err);
    process.exit(1); // exit if DB connection fails
  }
}

main();

// Optional: handle uncaught exceptions and unhandled rejections
process
  .on("uncaughtException", (error: any) => {
    console.log("Uncaught Exception, shutting down ...");
    console.log(error);
    process.exit(1);
  })
  .on("unhandledRejection", (error: any) => {
    console.log("Unhandled Rejection, shutting down ...");
    console.log(error);
    process.exit(1);
  });
