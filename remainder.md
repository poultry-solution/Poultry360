# Notification & Reminder Service Blueprint

This document serves as a blueprint for implementing a **Reminder-to-Notification system** in a Node.js + Prisma backend. The design leverages the existing notification infrastructure and ensures that you can start with a cron job scheduler and seamlessly switch to a queue-based worker system later.

---

## Folder Structure (Updated for Existing Codebase)

```
backend/
├── services/
│   ├── reminderService.ts      # Handles fetching, recurrence, and updating reminders
│   ├── reminderOrchestrator.ts # Coordinates reminder fetching and notification sending
│   ├── reminderCron.ts         # Cron job scheduler (temporary) or placeholder for queue integration
│   └── webpushService.ts       # ✅ EXISTING - Handles push notifications (reuse this)
├── controller/
│   ├── reminderController.ts   # CRUD operations for reminders
│   └── reminderNotificationController.ts # Testing and manual trigger endpoints
├── router/
│   ├── reminderRoutes.ts       # Reminder CRUD routes
│   └── reminderNotificationRoutes.ts # Reminder notification testing routes
├── utils/
│   └── reminderTypeMap.ts      # Maps ReminderType -> NotificationType
├── prisma/
│   └── schema.prisma           # ✅ EXISTING - Already has Reminder model
├── index.ts                    # ✅ EXISTING - Main server entry; will import cron
└── package.json                # ✅ EXISTING - Will add node-cron dependency
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

### 2. WebPushService (EXISTING - Reuse)

**Responsibilities:**

* ✅ Already handles creating Notification records in the database
* ✅ Already sends push notifications to all active subscriptions of a user
* ✅ Already handles invalid subscriptions and cleanup

```ts
// ✅ EXISTING - Already implemented in webpushService.ts
class NotificationService {
  async sendNotification(userId: string, payload: NotificationPayload) { ... }
  async sendBulkNotifications(userIds: string[], payload: NotificationPayload) { ... }
  async getUserNotifications(userId: string, page: number, limit: number) { ... }
  async markAsRead(notificationId: string, userId: string) { ... }
}
```

### 3. ReminderOrchestrator

**Responsibilities:**

* Fetch due reminders via `ReminderService`
* For each reminder, send notifications via existing `webpushService`
* Handle recurrence logic
* **Independent of scheduling mechanism**

```ts
import { reminderService } from './reminderService';
import { notificationService, NotificationType } from './webpushService';
import { reminderTypeMap } from '../utils/reminderTypeMap';

async function triggerReminders() {
  const dueReminders = await reminderService.getDueReminders();

  for (const reminder of dueReminders) {
    // Send notification using existing webpushService
    await notificationService.sendNotification(reminder.userId, {
      title: reminder.title,
      body: reminder.description || 'Reminder is due!',
      type: reminderTypeMap[reminder.type],
      data: {
        reminderId: reminder.id,
        farmId: reminder.farmId,
        batchId: reminder.batchId,
        url: reminder.batchId ? `/dashboard/batches/${reminder.batchId}` : '/dashboard'
      }
    });

    // Update reminder status and calculate next occurrence
    await reminderService.markAsTriggered(reminder);
  }
}
```

### 4. Scheduler / Cron Job

**Responsibilities:**

* Currently triggers `ReminderOrchestrator` periodically (e.g., every 5 minutes)
* Can later be replaced with a queue-based worker
* Integrates with existing server startup

```ts
import cron from 'node-cron';
import { triggerReminders } from './reminderOrchestrator';

// Schedule reminder checks every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('🔔 Checking for due reminders...');
  try {
    await triggerReminders();
    console.log('✅ Reminder check completed');
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
});

console.log('📅 Reminder cron job scheduled (every 5 minutes)');
```

---

## 5. ReminderType to NotificationType Mapping

```ts
import { ReminderType } from '@prisma/client';
import { NotificationType } from '../services/webpushService';

export const reminderTypeMap: Record<ReminderType, NotificationType> = {
  VACCINATION: NotificationType.VACCINATION_REMINDER,
  FEEDING: NotificationType.FEEDING_REMINDER,
  MEDICATION: NotificationType.MEDICATION_REMINDER,
  CLEANING: NotificationType.CLEANING_REMINDER,
  WEIGHING: NotificationType.WEIGHING_REMINDER,
  SUPPLIER_PAYMENT: NotificationType.SUPPLIER_PAYMENT_REMINDER,
  CUSTOMER_PAYMENT: NotificationType.CUSTOMER_PAYMENT_REMINDER,
  GENERAL: NotificationType.GENERAL_REMINDER
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

* [x] ✅ VAPID keys already configured in `webpushService.ts`
* [x] ✅ `pushSubscription` already saved per user and per device
* [x] ✅ Notification infrastructure already exists
* [ ] Create `reminderService.ts` for reminder CRUD operations
* [ ] Create `reminderOrchestrator.ts` for processing due reminders
* [ ] Create `reminderTypeMap.ts` for type mapping
* [ ] Create `reminderController.ts` and `reminderRoutes.ts` for API endpoints
* [ ] Create `reminderNotificationController.ts` for testing endpoints
* [ ] Add `node-cron` dependency to `package.json`
* [ ] Implement cron in `reminderCron.ts`
* [ ] Import cron in `index.ts`
* [ ] Create frontend components for reminder management
* [ ] Test in dev environment
* [ ] Ready to swap cron with queue later

## 9. API Endpoints Structure

### Reminder CRUD Routes (`/reminders`)
* `GET /` - Get user's reminders (with filtering)
* `POST /` - Create new reminder
* `PUT /:id` - Update reminder
* `DELETE /:id` - Delete reminder
* `GET /:id` - Get specific reminder

### Reminder Notification Routes (`/reminder-notifications`)
* `POST /test` - Send test reminder notification
* `POST /trigger-all` - Manually trigger all due reminders
* `GET /due` - Get currently due reminders
* `POST /:id/trigger` - Manually trigger specific reminder

---

**End of Blueprint**
