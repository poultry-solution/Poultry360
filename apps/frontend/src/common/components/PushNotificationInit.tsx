"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/common/store/store";
import {
  registerServiceWorker,
  isPushSupported,
  subscribeToPush,
  getExistingSubscription,
} from "@/common/lib/pushNotifications";

/**
 * Registers the service worker on mount and auto-subscribes to push
 * if the user has already granted permission.
 * Place this once in the root layout.
 */
export function PushNotificationInit() {
  const { isAuthenticated } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !isPushSupported()) return;
    initialized.current = true;
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isPushSupported()) return;

    (async () => {
      const existing = await getExistingSubscription();
      if (existing && Notification.permission === "granted") {
        await subscribeToPush();
      }
    })();
  }, [isAuthenticated]);

  return null;
}
