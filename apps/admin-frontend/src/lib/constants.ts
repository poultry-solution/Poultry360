// Admin Dashboard Constants
export const COLORS = {
  primary: '#10841E',
  primaryForeground: '#ffffff',
  secondary: 'hsl(210, 40%, 96%)',
  muted: 'hsl(210, 40%, 96%)',
  accent: 'hsl(210, 40%, 96%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
  border: 'hsl(214.3, 31.8%, 91.4%)',
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(222.2, 84%, 4.9%)',
  card: 'hsl(0, 0%, 100%)',
  popover: 'hsl(0, 0%, 100%)',
  ring: '#10841E'
} as const;

export const FONT_SIZES = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
} as const;

export const ADMIN_NAVIGATION = [
  {
    id: 'overview',
    label: 'System Overview',
    href: '/dashboard',
    icon: 'BarChart3'
  },
  {
    id: 'users',
    label: 'User Management',
    href: '/dashboard/users',
    icon: 'Users'
  },
  {
    id: 'farms',
    label: 'Farm Analytics',
    href: '/dashboard/farms',
    icon: 'Building2'
  },
  {
    id: 'batches',
    label: 'Batch Management',
    href: '/dashboard/batches',
    icon: 'Package'
  },
  {
    id: 'financial',
    label: 'Financial Overview',
    href: '/dashboard/financial',
    icon: 'DollarSign'
  },
  {
    id: 'suppliers',
    label: 'Supplier Analytics',
    href: '/dashboard/suppliers',
    icon: 'Truck'
  },
  {
    id: 'performance',
    label: 'Performance Metrics',
    href: '/dashboard/performance',
    icon: 'TrendingUp'
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    href: '/dashboard/reports',
    icon: 'FileText'
  }
] as const;

export const DASHBOARD_CARDS = {
  totalUsers: {
    title: 'Total Users',
    icon: 'Users',
    color: 'text-blue-600'
  },
  totalFarms: {
    title: 'Total Farms',
    icon: 'Building2',
    color: 'text-green-600'
  },
  activeBatches: {
    title: 'Active Batches',
    icon: 'Package',
    color: 'text-orange-600'
  },
  totalRevenue: {
    title: 'Total Revenue',
    icon: 'DollarSign',
    color: 'text-purple-600'
  },
  systemHealth: {
    title: 'System Health',
    icon: 'Activity',
    color: 'text-emerald-600'
  }
} as const;
