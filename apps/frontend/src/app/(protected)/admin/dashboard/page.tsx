"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { BarChart3, Users, Building2, Package, DollarSign, Activity, Truck } from "lucide-react";
import { useAuth } from "@/common/store/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Admin dashboard constants
const DASHBOARD_CARDS = {
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

const iconMap = {
  Users,
  Building2,
  Package,
  DollarSign,
  Activity,
  BarChart3,
};

// Mock data for demonstration
const dashboardStats = [
  {
    ...DASHBOARD_CARDS.totalUsers,
    value: '2,847',
    change: '+12.5%',
    trend: 'up'
  },
  {
    ...DASHBOARD_CARDS.totalFarms,
    value: '156',
    change: '+3.2%',
    trend: 'up'
  },
  {
    ...DASHBOARD_CARDS.activeBatches,
    value: '89',
    change: '-2.1%',
    trend: 'down'
  },
  {
    ...DASHBOARD_CARDS.totalRevenue,
    value: '$1.2M',
    change: '+18.7%',
    trend: 'up'
  },
  {
    ...DASHBOARD_CARDS.systemHealth,
    value: '98.5%',
    change: '+0.3%',
    trend: 'up'
  }
];

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // Check if user has admin role
      if (user?.role !== "SUPER_ADMIN") {
        // Redirect to appropriate dashboard
        if (user?.role === "DOCTOR") {
          router.push("/doctor/dashboard");
        } else if (user?.role === "OWNER" || user?.role === "MANAGER") {
          router.push("/farmer/dashboard/home");
        } else {
          router.push("/auth/login");
        }
        return;
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Overview</h1>
        <p className="text-muted-foreground">
          Monitor and manage your Poultry360 platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {dashboardStats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap];
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Recent User Activity</span>
            </CardTitle>
            <CardDescription>
              Latest user registrations and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">New registrations today</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active users (24h)</span>
                <span className="font-semibold">1,847</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Top performing user</span>
                <span className="font-semibold text-primary">Farm Elite</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-green-600" />
              <span>Farm Performance</span>
            </CardTitle>
            <CardDescription>
              Farm productivity and capacity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Average capacity</span>
                <span className="font-semibold">78.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Top performing farm</span>
                <span className="font-semibold text-primary">GreenFields</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">New farms this month</span>
                <span className="font-semibold">7</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span>Batch Analytics</span>
            </CardTitle>
            <CardDescription>
              Current batch status and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Batches completed</span>
                <span className="font-semibold">234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Average mortality</span>
                <span className="font-semibold">3.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Best FCR this month</span>
                <span className="font-semibold text-primary">1.45</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <span>System Health & Status</span>
          </CardTitle>
          <CardDescription>
            Real-time system performance and health indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Response</span>
                <span className="text-sm font-medium text-green-600">98.5%</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="text-sm font-medium text-green-600">99.2%</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '99.2%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Storage</span>
                <span className="text-sm font-medium text-yellow-600">76.3%</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '76.3%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Memory</span>
                <span className="text-sm font-medium text-green-600">84.1%</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '84.1%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/users")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>
              Manage users, roles, and permissions
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/farms")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-green-600" />
              <span>Farm Analytics</span>
            </CardTitle>
            <CardDescription>
              Monitor farm performance and analytics
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/batches")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span>Batch Management</span>
            </CardTitle>
            <CardDescription>
              Track and manage poultry batches
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/financial")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span>Financial Overview</span>
            </CardTitle>
            <CardDescription>
              View financial reports and analytics
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Additional Admin Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/performance")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              <span>Performance Metrics</span>
            </CardTitle>
            <CardDescription>
              Monitor farm performance and efficiency metrics
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/suppliers")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              <span>Supplier Analytics</span>
            </CardTitle>
            <CardDescription>
              Track supplier performance and relationships
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/admin/dashboard/reports")}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
              <span>Reports & Analytics</span>
            </CardTitle>
            <CardDescription>
              Generate and manage comprehensive reports
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}