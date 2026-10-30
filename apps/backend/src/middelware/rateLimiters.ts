import rateLimit from "express-rate-limit";

// 20 attempts per 15 minutes per IP — stops brute force while allowing a few
// mistyped passwords. Shared across every login surface (owner and staff) so a
// bad actor cannot pivot between them to bypass the limit.
//
// NOTE: this limiter keys on the request IP. Behind a reverse proxy, Express
// only sees the real client IP when `app.set("trust proxy", ...)` is enabled,
// which happens in index.ts when TRUST_PROXY_HOPS > 0. If the operator forgets
// that setting, every request shares one bucket and 20 failed logins can lock
// everyone out. index.ts logs a loud warning when it detects this misconfig.
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Test suites send many deliberate logins from the same in-memory address.
  // Rate-limit behavior belongs in focused limiter tests, not every API suite.
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Too many attempts, please try again later" },
});

// 5 OTP requests per hour per IP — password reset is rare; 6-digit OTP has 1M combinations.
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Too many OTP requests, please try again later" },
});
