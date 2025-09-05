# TanStack Query + Sonner Toast Integration

This setup provides automatic toast notifications for all API operations with comprehensive error handling.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools sonner
```

### 2. Setup Query Client Provider

Wrap your app with the QueryClientProvider:

```tsx
// app/layout.tsx or _app.tsx
import { QueryClientProvider } from "@/fetchers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 3. Setup Sonner Toast Container

Add the Toaster component to your layout:

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

## 📚 Usage Examples

### Basic Usage with Automatic Toasts

```tsx
import { useToastUserMutations } from "@/fetchers";

const UserManagement = () => {
  const { updateUser, deleteUser } = useToastUserMutations();

  const handleUpdateUser = async () => {
    // Success/error toasts are handled automatically
    await updateUser.mutateAsync({
      id: "user-123",
      data: { name: "New Name" }
    });
  };

  const handleDeleteUser = async () => {
    // Success/error toasts are handled automatically
    await deleteUser.mutateAsync("user-123");
  };

  return (
    <div>
      <button onClick={handleUpdateUser}>Update User</button>
      <button onClick={handleDeleteUser}>Delete User</button>
    </div>
  );
};
```

### Custom Toast Messages

```tsx
import { useToastMutation } from "@/fetchers";

const CustomOperation = () => {
  const customMutation = useToastMutation(
    async (data) => {
      // Your API call
      const response = await fetch("/api/custom", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Operation failed");
      return response.json();
    },
    {
      successMessage: "Custom operation completed successfully!",
      successTitle: "Success",
      errorMessage: "Failed to complete custom operation",
    }
  );

  return (
    <button onClick={() => customMutation.mutateAsync({ data: "test" })}>
      Run Custom Operation
    </button>
  );
};
```

### Manual Toast Notifications

```tsx
import { 
  handleApiSuccess, 
  handleApiError, 
  handleApiWarning, 
  handleApiInfo 
} from "@/fetchers";

const ManualToasts = () => {
  const showToasts = () => {
    handleApiSuccess("Operation completed!", "Success");
    handleApiError("Something went wrong!");
    handleApiWarning("Please check your input", "Warning");
    handleApiInfo("New data available", "Info");
  };

  return <button onClick={showToasts}>Show Toasts</button>;
};
```

## 🎯 Available Hooks

### User Operations
- `useToastUserMutations()` - All user CRUD operations with toasts
- `useGetAllUsers()` - Get users with pagination
- `useGetCurrentUser()` - Get current user profile
- `useGetUserById(id)` - Get specific user

### Farm Operations
- `useToastFarmMutations()` - All farm CRUD operations with toasts
- `useGetAllFarms()` - Get farms with filtering
- `useGetUserFarms()` - Get user's farms
- `useGetFarmById(id)` - Get specific farm
- `useGetFarmAnalytics(id)` - Get farm analytics

### Batch Operations
- `useToastBatchMutations()` - All batch CRUD operations with toasts
- `useGetAllBatches()` - Get batches with filtering
- `useGetFarmBatches(farmId)` - Get farm batches
- `useGetBatchById(id)` - Get specific batch
- `useGetBatchAnalytics(id)` - Get batch analytics

## 🔧 Configuration

### Query Client Configuration

The QueryClient is pre-configured with:
- 5-minute stale time
- 10-minute cache time
- Smart retry logic (no retry on 4xx errors)
- Global error handling with toast notifications

### Toast Configuration

Toasts are configured with:
- Success: 3-second duration
- Error: 5-second duration
- Warning: 4-second duration
- Info: 3-second duration

## 🎨 Customization

### Custom Error Handling

```tsx
import { useToastMutation } from "@/fetchers";

const customMutation = useToastMutation(
  async (data) => {
    // Your API call
  },
  {
    successMessage: "Custom success message",
    successTitle: "Custom Title",
    onSuccess: (data) => {
      // Custom success logic
    },
    onError: (error) => {
      // Custom error logic
    },
    invalidateQueries: [["users"], ["farms"]], // Custom cache invalidation
  }
);
```

### Global Error Interceptor

The QueryClient automatically handles all errors and shows appropriate toast notifications. You can customize this by modifying the `QueryClientProvider.tsx` file.

## 🚨 Error Types Handled

- **400 Bad Request** - Validation errors
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Access denied
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict
- **422 Unprocessable Entity** - Validation errors
- **500 Internal Server Error** - Server errors

## 📱 Loading States

All mutations provide loading states:

```tsx
const { createUser } = useToastUserMutations();

return (
  <button 
    disabled={createUser.isPending}
    onClick={() => createUser.mutateAsync(userData)}
  >
    {createUser.isPending ? "Creating..." : "Create User"}
  </button>
);
```

## 🔄 Cache Management

The toast mutations automatically invalidate relevant queries:

- User operations invalidate user lists
- Farm operations invalidate farm lists
- Batch operations invalidate batch lists

This ensures your UI stays in sync with the server state.

## 🛠️ Development

### React Query Devtools

The QueryClientProvider includes React Query Devtools in development mode. You can access it by clicking the React Query icon in your browser.

### Debugging

All API errors are logged to the console with the `handleApiError` function. Check the browser console for detailed error information.

## 📦 File Structure

```
src/fetchers/
├── index.ts                    # Main exports
├── providers/
│   └── QueryClientProvider.tsx # Query client setup
├── utils/
│   └── toastInterceptor.ts     # Toast utilities
├── hooks/
│   └── useToastMutations.ts    # Toast-enhanced mutations
├── users/
│   └── userQueries.ts          # User queries
├── farms/
│   └── farmQueries.ts          # Farm queries
├── batches/
│   └── batchQueries.ts         # Batch queries
└── examples/
    └── useToastExample.tsx     # Usage examples
```

This setup provides a robust, type-safe, and user-friendly API layer with automatic toast notifications! 🎉
