"use client";

import { useAuth } from "@/common/store/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { 
  Stethoscope, 
  Users, 
  Calendar,
  MessageSquare,
  Activity,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

export default function DoctorDashboard() {
  const { user } = useAuth();

  const doctorStats = [
    {
      title: "Active Consultations",
      value: "12",
      description: "Ongoing farmer consultations",
      icon: MessageSquare,
      color: "text-blue-600"
    },
    {
      title: "Farmers Served",
      value: "45",
      description: "Total farmers in your network",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Health Alerts",
      value: "3",
      description: "Requires immediate attention",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Success Rate",
      value: "94%",
      description: "Treatment success rate",
      icon: TrendingUp,
      color: "text-emerald-600"
    }
  ];

  const quickActions = [
    {
      title: "Chat with Farmers",
      description: "Start or continue consultations",
      icon: MessageSquare,
      href: "#"
    },
    {
      title: "Schedule Visits",
      description: "Plan farm visits and checkups",
      icon: Calendar,
      href: "#"
    },
    {
      title: "Health Monitoring",
      description: "Monitor batch health and trends",
      icon: Activity,
      href: "#"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: "consultation",
      farmer: "Ram Bahadur",
      farm: "Green Valley Farm",
      time: "2 hours ago",
      status: "completed"
    },
    {
      id: 2,
      type: "alert",
      farmer: "Sita Devi",
      farm: "Mountain View Poultry",
      time: "4 hours ago",
      status: "pending"
    },
    {
      id: 3,
      type: "visit",
      farmer: "Hari Prasad",
      farm: "Sunrise Farm",
      time: "1 day ago",
      status: "scheduled"
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
                Doctor Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back, Dr. {user?.name || "Doctor"}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              DOCTOR
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {doctorStats.map((stat, index) => {
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-base">{action.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        Access
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Latest Activities</CardTitle>
                <CardDescription>
                  Your recent consultations and farm visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Stethoscope className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.farmer}</p>
                          <p className="text-sm text-gray-600">{activity.farm}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={activity.status === "completed" ? "default" : 
                                  activity.status === "pending" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <Card className="mt-8 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">🚧 Coming Soon</CardTitle>
            <CardDescription className="text-amber-700">
              Full doctor functionality is being developed. This dashboard will include:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real-time chat with farmers</li>
                <li>Batch health monitoring and alerts</li>
                <li>Vaccination scheduling and reminders</li>
                <li>Farm visit planning and tracking</li>
                <li>Medical records and treatment history</li>
                <li>Disease outbreak monitoring</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
