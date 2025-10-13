# Route Structure - Poultry360 Frontend

## Overview
This document outlines the subdomain-based routing structure with role-prefixed routes using Next.js App Router.

## Subdomain Routing

### `admin.p360.com` - Admin Dashboard
- **Routes**: `/admin/dashboard`
- **Access**: SUPER_ADMIN role only
- **Features**: 
  - System-wide user management
  - Analytics and reporting
  - System configuration
  - Security monitoring

### `doctor.p360.com` - Doctor Dashboard  
- **Routes**: `/doctor/dashboard`
- **Access**: DOCTOR role only
- **Features**:
  - Farmer consultations
  - Health monitoring
  - Visit scheduling
  - Medical records

### `farmer.p360.com` - Farmer Dashboard
- **Routes**: `/farmer/dashboard/home`, `/farmer/dashboard/batches`, etc.
- **Access**: OWNER, MANAGER roles
- **Features**:
  - Batch management
  - Inventory tracking
  - Sales and expenses
  - Chat with doctors

### `dealer.p360.com` - Dealer Dashboard (Future)
- **Routes**: `/dealer/dashboard`
- **Access**: DEALER role
- **Features**: (To be implemented)
  - Inventory management
  - Order processing
  - Customer management

## Authentication Flow

1. **Unauthenticated users**: See landing page with login/signup options
2. **Authenticated users**: Automatically redirected to role-appropriate dashboard
3. **Role-based access**: Each route has access control via layouts

## File Structure

```
src/app/
├── farmer/                     # Farmer routes (actual URL segments)
│   ├── dashboard/
│   │   ├── page.tsx           # Redirects to /farmer/dashboard/home
│   │   ├── home/page.tsx      # Farmer home dashboard
│   │   ├── batches/           # Batch management
│   │   ├── farms/             # Farm management
│   │   ├── inventory/         # Inventory tracking
│   │   ├── chat-doctor/       # Chat with doctors
│   │   └── [other features]/
│   └── layout.tsx             # Farmer layout
├── doctor/                     # Doctor routes (actual URL segments)
│   ├── dashboard/
│   │   └── page.tsx           # Doctor dashboard
│   └── layout.tsx             # Doctor layout (future)
├── admin/                      # Admin routes (actual URL segments)
│   ├── dashboard/
│   │   └── page.tsx           # Admin dashboard
│   └── layout.tsx             # Admin layout (future)
├── dashboard/
│   └── page.tsx               # Universal dashboard (redirects to role-specific routes)
├── auth/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── page.tsx                   # Landing page
└── layout.tsx                 # Root layout

src/components/dashboard/
├── AdminDashboard.tsx         # Admin dashboard component
├── DoctorDashboard.tsx        # Doctor dashboard component
└── FarmerDashboard.tsx        # Farmer dashboard component
```

## Subdomain Configuration

The middleware (`src/middleware.ts`) handles subdomain routing by rewriting URLs:

- `admin.p360.com/dashboard` → internally serves `/admin/dashboard`
- `doctor.p360.com/dashboard` → internally serves `/doctor/dashboard`  
- `farmer.p360.com/dashboard/home` → internally serves `/farmer/dashboard/home`
- `dealer.p360.com/dashboard` → internally serves `/dealer/dashboard` (future)
- `p360.com` → Main landing page

## Role-Based Access

- **SUPER_ADMIN** → `admin.p360.com/dashboard`
- **DOCTOR** → `doctor.p360.com/dashboard`  
- **OWNER/MANAGER** → `farmer.p360.com/dashboard/home`
- **DEALER** → `dealer.p360.com/dashboard` (future)
- **Unauthenticated** → `p360.com` (landing page)

## Development vs Production

### Local Development
- Access routes directly: `localhost:3000/farmer/dashboard/home`
- No subdomain configuration needed
- All role-prefixed routes accessible

### Production
- Subdomain-based access: `farmer.p360.com/dashboard/home`
- Middleware rewrites to: `/farmer/dashboard/home`
- Clean URLs without role prefixes visible to users

### Local Subdomain Testing
- Add to `/etc/hosts`: `127.0.0.1 farmer.localhost doctor.localhost admin.localhost`
- Access: `farmer.localhost:3000/dashboard/home`
- Middleware rewrites to: `/farmer/dashboard/home`

## Benefits

1. **No Route Conflicts**: Each role has unique prefix (`/farmer/*`, `/doctor/*`, `/admin/*`)
2. **Clean Production URLs**: Subdomains hide role prefixes from users
3. **Local Dev Simplicity**: Direct access without subdomain setup
4. **Clear Structure**: Folder structure shows role ownership
5. **Easy Expansion**: Simple to add new role-specific features
6. **Transparent Rewriting**: Middleware handles URL translation automatically

## Next Steps

1. ✅ Basic dashboard structure created
2. ✅ Subdomain middleware implemented
3. ✅ Role-prefixed routes implemented
4. ✅ Universal dashboard redirects
5. 🔄 Configure DNS and hosting for subdomains
6. 🔄 Test subdomain routing in production
7. 🔄 Add navigation components
8. 🔄 Implement role-specific features
9. 🔄 Add cross-role communication (chat, notifications)