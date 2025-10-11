"use client";

import { useAuth } from "@/common/store/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { 
  Users, 
  Building2, 
  BarChart3, 
  Settings,
  Shield,
  Activity
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  const adminStats = [
    {
      title: "Total Users",
      value: "1,234",
      description: "Active users across all roles",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Companies",
      value: "45",
      description: "Registered feed companies",
      icon: Building2,
      color: "text-green-600"
    },
    {
      title: "System Health",
      value: "99.9%",
      description: "Uptime and performance",
      icon: Activity,
      color: "text-emerald-600"
    },
    {
      title: "Security",
      value: "Active",
      description: "All systems secure",
      icon: Shield,
      color: "text-purple-600"
    }
  ];

  const quickActions = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: Users,
      href: "#"
    },
    {
      title: "System Analytics",
      description: "View system-wide analytics and reports",
      icon: BarChart3,
      href: "#"
    },
    {
      title: "System Settings",
      description: "Configure system-wide settings",
      icon: Settings,
      href: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {user?.name || "Admin"}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              SUPER_ADMIN
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </div>
                  <CardDescription>
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Access
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Coming Soon Notice */}
        <Card className="mt-8 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">🚧 Coming Soon</CardTitle>
            <CardDescription className="text-amber-700">
              Full admin functionality is being developed. This dashboard will include:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User management and role assignment</li>
                <li>System-wide analytics and reporting</li>
                <li>Company and dealer management</li>
                <li>System configuration and settings</li>
                <li>Audit logs and security monitoring</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
