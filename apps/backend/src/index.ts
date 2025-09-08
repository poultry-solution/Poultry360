import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./router/index";
// import { UserSchema } from "@myapp/shared-types";
dotenv.config();

const PORT = process.env.PORT || 8081;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000" ||
  "http://localhost:3001"
)
  .split(",")
  .map((o) => o.trim());

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
