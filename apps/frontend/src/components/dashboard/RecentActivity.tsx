"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateDisplay } from "@/components/ui/date-display";

interface RecentActivityProps {
  recentActivity: any[];
  statsLoading: boolean;
  statsError: any;
}

export function RecentActivity({
  recentActivity,
  statsLoading,
  statsError,
}: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest updates from your farms and batches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : statsError ? (
          <div className="text-center py-8 text-red-600">
            <p>Failed to load recent activity</p>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-4"
              >
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.description} - {activity.farmName} -{" "}
                    <DateDisplay date={activity.timestamp} format="relative" />
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
