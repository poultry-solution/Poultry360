# Route Structure - Poultry360 Frontend

## Overview
This document outlines the subdomain-based routing structure using Next.js App Router route groups.

## Subdomain Routing

### `admin.p360.com` - Admin Dashboard
- **Route Group**: `(admin)`
- **Access**: SUPER_ADMIN role only
- **Features**: 
  - System-wide user management
  - Analytics and reporting
  - System configuration
  - Security monitoring

### `doctor.p360.com` - Doctor Dashboard  
- **Route Group**: `(doctor)`
- **Access**: DOCTOR role only
- **Features**:
  - Farmer consultations
  - Health monitoring
  - Visit scheduling
  - Medical records

### `farmer.p360.com` - Farmer Dashboard
- **Route Group**: `(farmer)`
- **Access**: OWNER, MANAGER roles
- **Features**:
  - Batch management
  - Inventory tracking
  - Sales and expenses
  - Chat with doctors

### `dealer.p360.com` - Dealer Dashboard (Future)
- **Route Group**: `(dealer)`
- **Access**: DEALER role
- **Features**: (To be implemented)
  - Inventory management
  - Order processing
  - Customer management

## Authentication Flow

1. **Unauthenticated users**: See landing page with login/signup options
2. **Authenticated users**: Automatically redirected to role-appropriate dashboard
3. **Role-based access**: Each route group has layout-level access control

## File Structure

```
src/app/
├── (farmer)/
│   ├── layout.tsx          # Farmer access control
│   └── dashboard/          # All existing farmer features
├── dashboard/
│   └── page.tsx            # Universal dashboard (handles all roles)
├── auth/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── page.tsx                # Landing page
└── layout.tsx              # Root layout

src/components/dashboard/
├── AdminDashboard.tsx      # Admin dashboard component
├── DoctorDashboard.tsx     # Doctor dashboard component
└── FarmerDashboard.tsx     # Farmer dashboard component
```

## Subdomain Configuration

The middleware (`src/middleware.ts`) handles subdomain routing:

- `admin.p360.com` → `/dashboard` (shows AdminDashboard component)
- `doctor.p360.com` → `/dashboard` (shows DoctorDashboard component)  
- `farmer.p360.com` → `/dashboard` (shows FarmerDashboard component)
- `dealer.p360.com` → `/dashboard` (shows DealerDashboard component - future)
- `p360.com` → Main landing page

## Role-Based Access

- **SUPER_ADMIN** → `admin.p360.com`
- **DOCTOR** → `doctor.p360.com`  
- **OWNER/MANAGER** → `farmer.p360.com`
- **DEALER** → `dealer.p360.com` (future)
- **Unauthenticated** → `p360.com` (landing page)

## Next Steps

1. ✅ Basic dashboard structure created
2. ✅ Subdomain middleware implemented
3. 🔄 Configure DNS and hosting for subdomains
4. 🔄 Implement authentication fixes
5. 🔄 Add navigation components
6. 🔄 Implement role-specific features
7. 🔄 Add cross-role communication (chat, notifications)
