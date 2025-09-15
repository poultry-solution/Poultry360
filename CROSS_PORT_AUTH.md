# Cross-Port Authentication Guide

This guide explains how to handle authentication across different ports in development and subdomains in production.

## 🏗️ Architecture

### Development Setup
- **Main App**: `localhost:3000` (Farmer Portal)
- **Doctor App**: `localhost:3001` (Doctor Portal)
- **Backend**: `localhost:8081` (Shared API)

### Production Setup
- **Main App**: `myapp.com` (Farmer Portal)
- **Doctor App**: `doctor.myapp.com` (Doctor Portal)
- **Backend**: `api.myapp.com` (Shared API)

## 🔧 How It Works

### 1. **Production (Subdomains)**
- Uses **httpOnly cookies** with domain set to `.myapp.com`
- Cookies are automatically shared across subdomains
- No additional setup needed

### 2. **Development (Different Ports)**
- Uses **localStorage** with a shared key (`poultry360-auth`)
- Implements URL parameter passing for cross-port navigation
- Temporary storage for seamless transitions

## 📦 Components

### Shared Auth Package (`packages/shared-auth`)
```typescript
import { crossPortAuth } from "@myapp/shared-auth";

// Store auth data
crossPortAuth.setAuthData(authData);

// Get auth data
const authData = crossPortAuth.getAuthData();

// Navigate to doctor app
crossPortAuth.navigateToDoctorApp();

// Navigate to main app
crossPortAuth.navigateToMainApp();
```

### Main App Store (`apps/frontend/src/store/store.ts`)
```typescript
import { useAuthStore } from "@/store/store";

const { navigateToDoctorApp } = useAuthStore();

// Navigate to doctor app
navigateToDoctorApp();
```

### Doctor App Store (`apps/doctor-frontend/src/store/authStore.ts`)
```typescript
import { useAuthStore } from "@/store/authStore";

const { navigateToMainApp } = useAuthStore();

// Navigate back to main app
navigateToMainApp();
```

## 🚀 Usage Examples

### 1. **From Main App to Doctor App**
```tsx
import { NavigateToDoctor } from "@/components/NavigateToDoctor";

// Simple button
<NavigateToDoctor />

// Custom styling
<NavigateToDoctor 
  className="bg-blue-500 hover:bg-blue-600"
  variant="outline"
  size="lg"
/>
```

### 2. **From Doctor App to Main App**
```tsx
import { NavigateToMain, BackToMainButton } from "@/components/NavigateToMain";

// Full navigation component
<NavigateToMain />

// Simple back button
<BackToMainButton />
```

### 3. **Programmatic Navigation**
```typescript
// In main app
const { navigateToDoctorApp } = useAuthStore();
navigateToDoctorApp();

// In doctor app
const { navigateToMainApp } = useAuthStore();
navigateToMainApp();
```

## 🔄 Authentication Flow

### Development Flow
1. User logs in on main app (`localhost:3000`)
2. Auth data stored in localStorage with shared key
3. User clicks "Switch to Doctor View"
4. Auth data passed via URL parameter to doctor app
5. Doctor app extracts auth data and stores it locally
6. User is authenticated in doctor app

### Production Flow
1. User logs in on main app (`myapp.com`)
2. httpOnly cookie set with domain `.myapp.com`
3. User navigates to `doctor.myapp.com`
4. Cookie automatically available in doctor app
5. User is authenticated via cookie

## 🛠️ Setup Instructions

### 1. **Install Dependencies**
```bash
# Build shared auth package
cd packages/shared-auth
npm run build
```

### 2. **Update Backend Cookie Settings**
The backend already has the correct cookie configuration:
```typescript
res.cookie("refreshToken", tokens.refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
  domain: process.env.NODE_ENV === "production" ? ".myapp.com" : undefined,
});
```

### 3. **Add Navigation Components**
```tsx
// In main app dashboard
import { NavigateToDoctor } from "@/components/NavigateToDoctor";

// In doctor app
import { NavigateToMain } from "@/components/NavigateToMain";
```

## 🔍 Troubleshooting

### Development Issues
- **Auth not working**: Check if both apps are running on correct ports
- **localStorage not shared**: Ensure both apps use the same storage key
- **Navigation fails**: Check browser console for errors

### Production Issues
- **Cookies not shared**: Verify domain is set to `.myapp.com`
- **HTTPS required**: Ensure both apps use HTTPS in production
- **CORS issues**: Check backend CORS configuration

## 📝 Environment Variables

### Development
```env
NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1
NODE_ENV=development
```

### Production
```env
NEXT_PUBLIC_API_URL=https://api.myapp.com/api/v1
NODE_ENV=production
```

## 🎯 Best Practices

1. **Always use the provided components** for navigation
2. **Test both development and production** scenarios
3. **Handle authentication errors** gracefully
4. **Clear auth data** on logout
5. **Use TypeScript** for type safety

## 🔐 Security Notes

- **Development**: Uses localStorage (less secure, but convenient)
- **Production**: Uses httpOnly cookies (more secure)
- **Tokens**: Access tokens expire in 1 hour
- **Refresh**: Refresh tokens expire in 7 days
- **Domain**: Cookies only work on configured domains

## 📚 API Reference

### CrossPortAuth Class
```typescript
class CrossPortAuth {
  setAuthData(authData: AuthData): void
  getAuthData(): AuthData | null
  clearAuthData(): void
  navigateToDoctorApp(): void
  navigateToMainApp(): void
  handleAuthFromUrl(): AuthData | null
}
```

### AuthData Interface
```typescript
interface AuthData {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    companyName?: string;
  };
}
```

This system provides a seamless authentication experience across your multi-app architecture! 🚀
