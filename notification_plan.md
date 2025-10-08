# 🔔 Poultry360 Notification System Blueprint

## 📋 Overview

This document outlines the complete notification system architecture for Poultry360, designed to be **future-proof**, **scalable**, and **PWA-ready**. The system will support real-time notifications for chat messages, batch updates, and other critical farm management events.

---

## 🧭 System Architecture

```
                 ┌────────────────────────────┐
                 │        Frontend App        │
                 │ (React / Next.js)          │
                 └───────────┬────────────────┘
                             │
     (1) Request permission + register Service Worker
                             │
                             ▼
                 ┌────────────────────────────┐
                 │     Service Worker (SW)    │
                 │ - Subscribes via Push API  │
                 │ - Receives push events     │
                 │ - Displays notifications   │
                 └───────────┬────────────────┘
                             │
           (2) Send subscription to backend
                             │
                             ▼
                 ┌────────────────────────────┐
                 │         Backend API        │
                 │   Node.js + Express        │
                 │                            │
                 │  NotificationService       │
                 │   ├─ DB (Prisma)           │
                 │   ├─ WebPushAdapter        │
                 │   └─ FCMAdapter (future)   │
                 └───────────┬────────────────┘
                             │
         (3) Trigger push via Web Push (VAPID)
                             │
                             ▼
                 ┌────────────────────────────┐
                 │     Browser Push Server     │
                 │ (Managed by browser vendors)│
                 └───────────┬────────────────┘
                             │
         (4) Deliver push to user's device
                             │
                             ▼
                 ┌────────────────────────────┐
                 │     Service Worker (SW)    │
                 │  Receives & shows notif    │
                 └────────────────────────────┘
```

---

## 🎯 Notification Types

### 1. **Chat Notifications**
- New message from doctor/farmer
- Message read receipts
- Voice message received
- File attachment received

### 2. **Batch Management**
- Batch status changes (Active → Completed)
- Mortality threshold alerts
- Feed consumption warnings
- Weight tracking milestones

### 3. **Farm Operations**
- Expense alerts (high spending)
- Sales notifications
- Inventory low stock warnings
- Scheduled task reminders

### 4. **System Notifications**
- Account updates
- Security alerts
- Feature announcements

### 4. **Altert NOtification**
- Vaccinnation ALerts 
- Remaninders Alerts 
- Request Alert (like someone request something for furtue use)


---

## 🗄️ Database Schema

### User Model Extension
```prisma
model User {
  // ... existing fields
  pushSubscription    Json?     // Web Push subscription object
  notificationEnabled Boolean   @default(true)
  notificationSettings Json?    // User preferences
}
```

### Notification Model
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  body      String
  data      Json?    // Metadata (url, type, IDs, etc.)
  read      Boolean  @default(false)
  type      NotificationType
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

enum NotificationType {
  CHAT_MESSAGE
  BATCH_UPDATE
  FARM_ALERT
  SYSTEM
  EXPENSE_WARNING
  MORTALITY_ALERT
  FEED_WARNING
  SALES_NOTIFICATION
}
```

---

## ⚙️ Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Backend Setup
- [ ] Install `web-push` package
- [ ] Generate VAPID keys
- [ ] Create notification service
- [ ] Add database schema
- [ ] Create API endpoints

#### 1.2 Frontend Setup
- [ ] Create service worker
- [ ] Implement permission request
- [ ] Add subscription management
- [ ] Create notification components

### Phase 2: Chat Notifications (Week 3)

#### 2.1 Real-time Chat Alerts
- [ ] Integrate with existing socket system
- [ ] Send notifications for new messages
- [ ] Handle offline message notifications
- [ ] Add notification click handling

#### 2.2 Message Types
- [ ] Text message notifications
- [ ] Voice message notifications
- [ ] File attachment notifications
- [ ] Batch share notifications

### Phase 3: Farm Management Notifications (Week 4)

#### 3.1 Batch Operations
- [ ] Mortality threshold alerts
- [ ] Feed consumption warnings
- [ ] Weight tracking milestones
- [ ] Batch completion notifications

#### 3.2 Financial Alerts
- [ ] High expense warnings
- [ ] Sales notifications
- [ ] Inventory alerts

### Phase 4: Advanced Features (Week 5)

#### 4.1 User Preferences
- [ ] Notification settings page
- [ ] Quiet hours configuration
- [ ] Notification type preferences
- [ ] Sound/vibration settings

#### 4.2 Notification History
- [ ] In-app notification center
- [ ] Mark as read functionality
- [ ] Notification search/filter
- [ ] Bulk actions

---

## 🔧 Technical Implementation

### Service Worker (`/public/service-worker.js`)

```javascript
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: {
      url: data.data?.url || "/",
      type: data.type,
      ...data.data,
    },
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Poultry360", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      const appClient = allClients.find((client) =>
        client.url.includes(self.origin)
      );

      if (appClient) {
        appClient.focus();
        appClient.postMessage({ 
          type: "NOTIFICATION_CLICK", 
          data: event.notification.data 
        });
      } else {
        clients.openWindow(event.notification.data.url);
      }
    })()
  );
});
```

### Backend Service (`notificationService.ts`)

```typescript
import webpush from "web-push";
import { prisma } from "../utils/prisma";

webpush.setVapidDetails(
  "mailto:admin@poultry360.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export class NotificationService {
  async sendNotification(
    userId: string, 
    payload: {
      title: string;
      body: string;
      data?: any;
      type: NotificationType;
    }
  ) {
    try {
      // Save to database
      const notification = await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          type: payload.type,
        },
      });

      // Get user's push subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushSubscription: true, notificationEnabled: true },
      });

      if (!user?.pushSubscription || !user.notificationEnabled) {
        return { success: false, reason: "No subscription or disabled" };
      }

      // Send push notification
      await webpush.sendNotification(
        user.pushSubscription as any,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data,
          type: payload.type,
        })
      );

      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error("Failed to send notification:", error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkNotifications(
    userIds: string[],
    payload: {
      title: string;
      body: string;
      data?: any;
      type: NotificationType;
    }
  ) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotification(userId, payload))
    );
    
    return results.map((result, index) => ({
      userId: userIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : result.reason,
    }));
  }
}

export const notificationService = new NotificationService();
```

### API Endpoints

```typescript
// Subscribe to push notifications
router.post("/subscribe", authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: { pushSubscription: subscription },
  });

  res.json({ success: true });
});

// Get user notifications
router.get("/notifications", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { read: false }),
    },
    orderBy: { createdAt: "desc" },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  res.json({ notifications });
});

// Mark notification as read
router.patch("/notifications/:id/read", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });

  res.json({ success: true });
});
```

---

## 🎨 Frontend Integration

### Notification Hook (`useNotifications.ts`)

```typescript
export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    setSubscription(sub);
    
    // Send subscription to backend
    await api.post('/notifications/subscribe', {
      subscription: sub.toJSON(),
    });

    return sub;
  };

  return {
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
  };
};
```

### Notification Center Component

```typescript
export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const markAsRead = async (notificationId: string) => {
    await api.patch(`/notifications/${notificationId}/read`);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="notification-center">
      <div className="header">
        <h3>Notifications</h3>
        <Badge variant="secondary">{unreadCount} unread</Badge>
      </div>
      
      <div className="notifications-list">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={markAsRead}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## 🔗 Integration Points

### 1. Chat System Integration
- **Location**: `apps/backend/src/services/socketService.ts`
- **Trigger**: New message received
- **Action**: Send notification to recipient if offline

### 2. Batch Management Integration
- **Location**: `apps/backend/src/controller/batchController.ts`
- **Trigger**: Batch status changes, mortality alerts
- **Action**: Notify farm owner

### 3. Expense System Integration
- **Location**: `apps/backend/src/controller/expenseController.ts`
- **Trigger**: High expense threshold exceeded
- **Action**: Send warning notification

### 4. Sales System Integration
- **Location**: `apps/backend/src/controller/salesController.ts`
- **Trigger**: New sale recorded
- **Action**: Notify farm owner of sale

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# VAPID Keys (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@poultry360.com
```

### Service Worker Registration
- [ ] Add service worker to `public/` directory
- [ ] Register in `_app.tsx` or `layout.tsx`
- [ ] Test on HTTPS (required for push notifications)

### Database Migration
- [ ] Run Prisma migration for new schema
- [ ] Update existing users with default notification settings

### Testing
- [ ] Test permission request flow
- [ ] Test notification display
- [ ] Test click handling
- [ ] Test offline scenarios
- [ ] Test different notification types

---

## 🔮 Future Enhancements

### Mobile App Support
- Replace `web-push` with Firebase Cloud Messaging (FCM)
- Reuse existing notification service architecture
- Add mobile-specific notification features

### Advanced Features
- **Scheduled Notifications**: Remind users of upcoming tasks
- **Location-based Notifications**: Farm-specific alerts
- **Rich Notifications**: Images, action buttons, progress bars
- **Notification Analytics**: Track engagement and effectiveness

### Performance Optimizations
- **Batch Processing**: Group multiple notifications
- **Rate Limiting**: Prevent notification spam
- **Smart Delivery**: Optimize timing based on user activity
- **Caching**: Store notification templates for faster delivery

---

## 📊 Success Metrics

### User Engagement
- Notification permission grant rate
- Notification click-through rate
- User retention after notification implementation

### Technical Performance
- Notification delivery success rate
- Service worker registration rate
- Push subscription success rate

### Business Impact
- Reduced response time to critical alerts
- Increased user engagement with chat system
- Improved farm management efficiency

---

## 🛠️ Development Timeline

| Week | Focus Area | Deliverables |
|------|------------|--------------|
| 1 | Backend Infrastructure | Notification service, API endpoints, database schema |
| 2 | Frontend Foundation | Service worker, permission handling, subscription management |
| 3 | Chat Integration | Real-time message notifications, offline handling |
| 4 | Farm Management | Batch alerts, expense warnings, sales notifications |
| 5 | Polish & Testing | User preferences, notification center, comprehensive testing |

---

## 📝 Notes

- **HTTPS Required**: Push notifications only work over HTTPS
- **Browser Support**: Chrome, Firefox, Safari, Edge (modern versions)
- **PWA Ready**: Foundation for future Progressive Web App features
- **Scalable**: Architecture supports future mobile app integration
- **User-Centric**: Respects user preferences and provides opt-out options

---

*This blueprint provides a comprehensive foundation for implementing a robust notification system that will enhance user engagement and improve the overall Poultry360 experience.*
