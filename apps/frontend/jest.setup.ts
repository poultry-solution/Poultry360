// Prod runs in UTC (Docker). Dev Macs run in Asia/Kathmandu. Pin the test
// clock to UTC so midnight-adjacent Nepal-day bugs stop hiding on dev.
// Override with `TZ=Asia/Kathmandu pnpm test` when you want to cross-check.
process.env.TZ = process.env.TZ ?? "UTC";
