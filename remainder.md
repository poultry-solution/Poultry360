# Notification & Reminder Service Blueprint

This document serves as a blueprint for implementing a **Reminder-to-Notification system** in a Node.js + Prisma backend. The design ensures that you can start with a cron job scheduler and seamlessly switch to a queue-based worker system later.

---

## Folder Structure

```
backend/
├── services/
│   ├── reminderService.ts      # Handles fetching, recurrence, and updating reminders
│   ├── notificationService.ts  # Handles creating Notification records and sending push notifications
│   ├── orchestrator.ts         # Coordinates reminder fetching and notification sending
│   └── reminderCron.ts         # Cron job scheduler (temporary) or placeholder for queue integration
├── utils/
│   ├── webpushClient.ts        # Configured web-push instance with VAPID keys
│   └── reminderTypeMap.ts      # Maps ReminderType -> NotificationType
├── prisma/
│   └── schema.prisma
├── index.ts                     # Main server entry; imports cron
└── package.json
```

---

## Services Design

### 1. ReminderService

**Responsibilities:**

* Fetch due reminders
* Calculate next occurrence for recurring reminders
* Update reminder status (`lastTriggered`, `dueDate`, `status`)

```ts
class ReminderService {
  async getDueReminders(): Promise<Reminder[]> { ... }
  async markAsTriggered(reminder: Reminder) { ... }
  async calculateNextOccurrence(reminder: Reminder): Date | null { ... }
}
```

### 2. NotificationService

**Responsibilities:**

* Create Notification records in the database
* Send push notifications to all active subscriptions of a user
* Handle invalid subscriptions and cleanup

```ts
class NotificationService {
  async createNotificationRecord(reminder: Reminder) { ... }
  async sendNotificationToUser(userId: string, payload: NotificationPayload) { ... }
}
```

### 3. Orchestrator

**Responsibilities:**

* Fetch due reminders via `ReminderService`
* For each reminder, send notifications via `NotificationService`
* Handle recurrence logic
* **Independent of scheduling mechanism**

```ts
async function triggerReminders() {
  const dueReminders = await reminderService.getDueReminders();

  for (const reminder of dueReminders) {
    await notificationService.createNotificationRecord(reminder);
    await notificationService.sendNotificationToUser(reminder.userId, {
      title: reminder.title,
      body: reminder.description || 'Reminder is due!',
      type: reminderTypeMap[reminder.type],
      reminderId: reminder.id
    });

    await reminderService.markAsTriggered(reminder);
  }
}
```

### 4. Scheduler / Cron Job

**Responsibilities:**

* Currently triggers `Orchestrator` periodically (e.g., every 5 minutes)
* Can later be replaced with a queue-based worker

```ts
import cron from 'node-cron';
import { triggerReminders } from './orchestrator';

cron.schedule('*/5 * * * *', async () => {
  console.log('Checking for due reminders...');
  await triggerReminders();
});
```

---

## 5. ReminderType to NotificationType Mapping

```ts
export const reminderTypeMap: Record<ReminderType, NotificationType> = {
  VACCINATION: 'VACCINATION_ALERT',
  FEEDING: 'FEED_WARNING',
  MEDICATION: 'MEDICATION_ALERT',
  CLEANING: 'GENERAL',
  WEIGHING: 'GENERAL',
  SUPPLIER_PAYMENT: 'REQUEST_ALERT',
  CUSTOMER_PAYMENT: 'REQUEST_ALERT',
  GENERAL: 'SYSTEM'
};
```

---

## 6. Key Principles

1. **Decoupling:**

   * Reminder logic, notification creation, and scheduling are separate.
2. **Cron first, Queue later:**

   * Cron job calls orchestrator now; swap with queue worker later.
3. **Multi-device support:**

   * Store all active subscriptions per user; send notification to all.
4. **Recurring reminders:**

   * Orchestrator calculates next due date and updates reminder.
5. **Error handling:**

   * Catch failed pushes, remove invalid subscriptions.
6. **Testable:**

   * Services can be unit tested independently from scheduler.

---

## 7. Future Enhancements

* Switch cron to **queue-based scheduling** (BullMQ / Agenda.js) for exact timing and scalability.
* Notification batching if multiple reminders are due.
* Interaction handling (snooze, dismiss) via push action.
* Dashboard to view pending/completed reminders and notifications.

---

## 8. Quick Integration Checklist

* [ ] Configure VAPID keys in `webpushClient.ts`
* [ ] Ensure `pushSubscription` is saved per user and per device
* [ ] Create services as per blueprint
* [ ] Implement cron in `reminderCron.ts`
* [ ] Import cron in `index.ts`
* [ ] Test in dev environment
* [ ] Ready to swap cron with queue later

---

**End of Blueprint**
