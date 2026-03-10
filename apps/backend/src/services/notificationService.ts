import prisma from "../utils/prisma";
import { sendPushToUser, type PushPayload } from "./pushService";
import type { Prisma } from "@prisma/client";

export interface NotifyUserInput {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sendPush?: boolean;
}

/**
 * Central function to emit a notification for any module.
 * Creates an in-app notification and optionally sends a push.
 */
export async function notifyUser(userId: string, input: NotifyUserInput) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  if (input.sendPush !== false) {
    const payload: PushPayload = {
      notificationId: notification.id,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
    };
    try {
      const pushResult = await sendPushToUser(userId, payload);
      if (pushResult.failed > 0) {
        console.warn(`[notify] push had failures userId=${userId} sent=${pushResult.sent} failed=${pushResult.failed} total=${pushResult.total}`);
      }
    } catch (err) {
      console.error("[notify] push send error:", err);
      // Push failure should not break the notification flow
    }
  }

  return notification;
}

export async function listNotifications(
  userId: string,
  opts: { status?: "UNREAD" | "READ"; limit?: number; offset?: number } = {}
) {
  const where: any = { userId };
  if (opts.status) where.status = opts.status;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, status: "UNREAD" } });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { status: "READ", readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, status: "UNREAD" },
    data: { status: "READ", readAt: new Date() },
  });
}
