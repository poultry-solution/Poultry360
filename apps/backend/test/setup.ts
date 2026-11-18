/**
 * Global test setup - runs before all tests
 */
import dotenv from 'dotenv';

// Prod runs in UTC (Docker). Dev Macs run in Asia/Kathmandu. Pin the test
// clock to UTC so midnight-adjacent Nepal-day bugs stop hiding on dev.
// Override with `TZ=Asia/Kathmandu pnpm test` when you want to cross-check.
process.env.TZ = process.env.TZ ?? 'UTC';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Increase timeout for all tests
jest.setTimeout(30000);

// Mock console to reduce noise (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};
