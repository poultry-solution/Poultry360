function nonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export const trustedProxyHops = nonNegativeInteger(process.env.TRUST_PROXY_HOPS, 0);
export const auditSecurityRetentionDays = Math.max(1, nonNegativeInteger(process.env.AUDIT_SECURITY_RETENTION_DAYS, 30));

const configuredGeoHeaderSource = (process.env.TRUSTED_GEO_HEADER_SOURCE || "none").toLowerCase();
export const trustedGeoHeaderSource = configuredGeoHeaderSource === "cloudflare" || configuredGeoHeaderSource === "vercel"
  ? configuredGeoHeaderSource
  : "none";
