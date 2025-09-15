import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import routes from "./router/index";
import { getSocketService } from "./services/socketService";
// import { UserSchema } from "@myapp/shared-types";
dotenv.config();

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
  // console.log(req.body);
  // console.log(req.headers);
  // console.log(req.params);
  // console.log(req.query);
  next();
});

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
  res.send("OK");
});

// Initialize Socket.IO service
const socketService = getSocketService(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
});
