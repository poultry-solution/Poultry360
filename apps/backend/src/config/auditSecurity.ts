function nonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

// Prod runs the API inside a Docker container behind Nginx on EC2 — exactly
// one trusted hop — so default to 1 there. Dev talks to the API directly and
// must stay at 0, otherwise any client can forge X-Forwarded-For to spoof
// their IP (bypassing rate limits, poisoning audit logs). Operators can still
// override explicitly for chained-proxy setups.
const trustProxyDefault = process.env.NODE_ENV === "production" ? 1 : 0;
export const trustedProxyHops = nonNegativeInteger(process.env.TRUST_PROXY_HOPS, trustProxyDefault);
export const auditSecurityRetentionDays = Math.max(1, nonNegativeInteger(process.env.AUDIT_SECURITY_RETENTION_DAYS, 30));

const configuredGeoHeaderSource = (process.env.TRUSTED_GEO_HEADER_SOURCE || "none").toLowerCase();
export const trustedGeoHeaderSource = configuredGeoHeaderSource === "cloudflare" || configuredGeoHeaderSource === "vercel"
  ? configuredGeoHeaderSource
  : "none";
