import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import routes from "./router/index";
import { getSocketService } from "./services/socketService";
dotenv.config();


const PORT = process.env.PORT || 8081;
const app = express();
const server = createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://poultry360-frontend.vercel.app",
];

const defaultOrigin = "https://poultry360-frontend.vercel.app";

console.log("🔧 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // With credentials: true we must return a specific origin, never *
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || defaultOrigin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
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
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

// Export app for testing
export default app;
