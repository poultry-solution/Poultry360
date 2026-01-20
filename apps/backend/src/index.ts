import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import routes from "./router/index";
import { getSocketService } from "./services/socketService";
dotenv.config();

import "./services/webpushService";
import { initializeReminderCron, shutdownReminderCron } from "./services/reminderCron";


const PORT = process.env.PORT || 8081;
const app = express();
const server = createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000,http://localhost:3001,http://localhost:3002"
)
  .split(",")
  .map((o) => o.trim());

console.log("🔧 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

// req middleware for debug
app.use((req, res, next) => {
  console.log("--------------------------------");
  console.log(`${req.method} ${req.url}`);
  console.log("--------------------------------");
  next();
});

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
  res.json({ message: "Server is running" });
});

// Initialize Socket.IO service
const socketService = getSocketService(server);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO server initialized`);
    
    // Initialize reminder cron job
    initializeReminderCron();
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    shutdownReminderCron();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    shutdownReminderCron();
    process.exit(0);
  });
}

// Export app for testing
export default app;
