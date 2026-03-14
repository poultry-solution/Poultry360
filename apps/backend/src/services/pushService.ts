import webPush from "web-push";
import prisma from "../utils/prisma";

// Fallback for prod when env vars are not set (e.g. Docker without VAPID in env)
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BCF5MVBCwIq_otMSLE0wveMLcdxbZBlbaNNeuVWJV_uCPRVcd8x6RImyL4t-jW2mC3NQEP2vuluuOizGxDlTv7k";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "n1-lsRzUaKcDnb7cEh9W657O5mYeYOa96AMkLL1Fk68";
const VAPID_SUBJECT = "mailto:support@poultry360.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
) {
  return prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
    update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent, revokedAt: null },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId, revokedAt: null },
  });

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webPush.sendNotification(pushSub, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { revokedAt: new Date() },
          });
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[push] userId=${userId} total=${subs.length} sent=${sent} failed=${failed}`);

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const sub = subs[i];
      const endpointPreview = sub.endpoint.slice(0, 50) + "...";
      const err = result.reason;
      const code = err?.statusCode ?? err?.code;
      const msg = err?.message ?? String(err);
      console.warn(`[push] failed endpoint=${endpointPreview} statusCode=${code} message=${msg}`);
    }
  });

  return { sent, failed, total: subs.length };
}
