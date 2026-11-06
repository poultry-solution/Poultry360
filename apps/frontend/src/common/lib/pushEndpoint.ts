/**
 * The current browser's push endpoint, or null. Used on logout so the server
 * stops sending this person's alerts to a device they logged out of. The
 * browser subscription itself is kept, so the next person who logs in on this
 * device is re-linked automatically (PushNotificationInit).
 *
 * Kept in its own file (no axios import) so the auth store can use it
 * without an import cycle.
 */
export async function getCurrentPushEndpoint(): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return null;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}
