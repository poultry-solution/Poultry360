# Common Folder Structure

This folder contains shared components, hooks, services, and utilities that are used across the application. This structure eliminates the need for shared packages and provides a clean, organized way to manage reusable code.

## Structure

```
common/
├── components/
│   ├── ui/           # Shadcn UI components (Button, Input, Modal, etc.)
│   ├── chat/         # Chat system components
│   ├── notifications/ # Notification components
│   └── auth/         # Auth components
├── hooks/            # Custom hooks (useChat, useNotifications, etc.)
├── contexts/         # React contexts (ChatContext)
├── services/         # Services (chatservices, notificationActionService)
├── lib/              # Utilities (axios, utils)
├── types/            # TypeScript types
├── providers/        # React providers
└── store/            # State management (Zustand store)
```

## Migration Summary

The following components have been migrated from the original structure to this common folder:

### Chat System
- **Components**: ChatHeader, ChatInputBar, MessageList, ShareBatchModal, VoiceRecorder
- **Context**: ChatContext
- **Hook**: useChat
- **Services**: chatQueries, socketService
- **Types**: chat.ts

### UI Components
- All Shadcn UI components (Button, Input, Modal, Card, etc.)
- Data table components
- Form components

### Notification System
- **Components**: NotificationBell, NotificationCenter
- **Hooks**: useNotifications, useNotificationActions
- **Services**: notificationActionService

### Authentication
- **Components**: AuthGuard, RoleBasedRedirect, RoleBasedMiddleware
- **Hooks**: useRoleBasedRouting, usePasswordVerification
- **Store**: store.ts (Zustand store)

### Utilities & Providers
- **Lib**: axios.ts, utils.ts
- **Providers**: AuthProvider, LoadingProvider, QueryProvider, ToastProvider, QueryClientProvider

### Other Hooks
- useCalendar

## Usage

Import from the common folder using the `@/common/` alias:

```typescript
// UI Components
import { Button } from "@/common/components/ui/button";
import { Modal } from "@/common/components/ui/modal";

// Chat System
import { ChatHeader } from "@/common/components/chat/ChatHeader";
import { useChat } from "@/common/hooks/useChat";
import { ChatProvider } from "@/common/contexts/ChatContext";

// Notifications
import { NotificationBell } from "@/common/components/notifications/NotificationBell";
import { useNotifications } from "@/common/hooks/useNotifications";

// Auth
import { AuthGuard } from "@/common/components/auth/AuthGuard";
import { useRoleBasedRouting } from "@/common/hooks/useRoleBasedRouting";

// Utilities
import { cn } from "@/common/lib/utils";
import axiosInstance from "@/common/lib/axios";

// Providers
import { AuthProvider } from "@/common/providers/AuthProvider";
import { QueryProvider } from "@/common/providers/QueryProvider";

// Store
import { useAuthStore } from "@/common/store/store";
```

## Benefits

1. **No Shared Package Pain**: Eliminates the need for shared packages and their rebuild issues
2. **Instant Hot Reload**: Changes apply immediately without package rebuilds
3. **Clean Organization**: All shared code is in one place with clear structure
4. **Easy Maintenance**: Single source of truth for shared components
5. **Future-Ready**: Ready for the unified architecture described in UNIFIED_APP_REFACTOR_PLAN.md

## Next Steps

This common folder structure prepares the codebase for the unified architecture where:
- Doctor-frontend and admin-frontend can reference this common folder
- The unified app can use this structure as the foundation for the `(shared)` route group
- Cross-role features can be easily implemented using these shared components

## Notes

- All import paths have been updated to use the `@/common/` alias
- The original files remain in place until the migration is fully tested
- This structure follows Next.js best practices for shared code organization
