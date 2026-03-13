import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app";
import cacheService from "./app/utils/cache";
import { apmService } from "./app/utils/apm";
import logger from "./app/utils/logger";

dotenv.config();
async function main() {
  try {
    // Initialize Redis cache service (optional, doesn't fail if redis unavailable)
    await cacheService.initialize();

    // MongoDB connect
    const dbUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/hrm";
    await mongoose.connect(dbUrl);
    logger.info("MongoDB Connected Successfully");

    // Start APM health checks
    apmService.startHealthChecks(60000); // Check every 60 seconds

    // Start Express server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring/health`);
      console.log(`📈 Metrics: http://localhost:${PORT}/api/monitoring/metrics`);
      console.log(`📋 Performance: http://localhost:${PORT}/api/monitoring/performance`);
      console.log(`📝 Report: http://localhost:${PORT}/api/monitoring/report`);
      console.log(`📄 Prometheus: http://localhost:${PORT}/api/monitoring/prometheus`);
      console.log(`📖 Docs: http://localhost:${PORT}/docs`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM signal received: closing HTTP server");
      apmService.stopHealthChecks();
      server.close(async () => {
        await cacheService.close();
        await mongoose.connection.close();
        logger.info("HTTP server and connections closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT signal received: closing HTTP server");
      apmService.stopHealthChecks();
      server.close(async () => {
        await cacheService.close();
        await mongoose.connection.close();
        logger.info("HTTP server and connections closed");
        process.exit(0);
      });
    });
  } catch (err) {
    console.error("Server or DB connection error:", err);
    logger.error("Server startup failed", {
      error: err instanceof Error ? err.message : String(err)
    });
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
