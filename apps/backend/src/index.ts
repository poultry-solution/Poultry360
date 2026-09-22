import "./env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import routes from "./router/index";
import { getSocketService } from "./services/socketService";
import { startReminderDispatcher } from "./services/reminderDispatcher";
import { startBusinessAuditArchiver } from "./services/businessAuditService";
import { trustedGeoHeaderSource, trustedProxyHops } from "./config/auditSecurity";


const PORT = process.env.PORT || 8081;

// Never allow production to fall back to the development JWT defaults. The
// password-reset proof intentionally has its own signing secret as well.
if (process.env.NODE_ENV === "production") {
  const missingSecrets = ["JWT_SECRET", "JWT_REFRESH_SECRET", "PASSWORD_RESET_SECRET"]
    .filter((name) => !process.env[name]);
  if (missingSecrets.length > 0) {
    throw new Error(`Missing required production secret(s): ${missingSecrets.join(", ")}`);
  }
}

const app = express();
const server = createServer(app);
if (trustedProxyHops > 0) {
  app.set("trust proxy", trustedProxyHops);
  console.log(`Trusted proxy hops enabled for sign-in security metadata: ${trustedProxyHops}`);
}
if (trustedGeoHeaderSource !== "none" && trustedProxyHops === 0) {
  console.warn("Trusted location headers are disabled until TRUST_PROXY_HOPS is configured.");
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",

  // Production
  "https://poultry360.org",
  "https://www.poultry360.org",

  "https://poultry360-frontend.vercel.app",
  "https://poultry360.org",
  "https://www.poultry360.org",
];

const defaultOrigin = "https://poultry360.org";

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
    startReminderDispatcher(60_000);
    startBusinessAuditArchiver();
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
