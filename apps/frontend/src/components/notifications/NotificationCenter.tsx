"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Settings,
  X,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useNotifications, NotificationData } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "CHAT_MESSAGE":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "BATCH_UPDATE":
    case "SALES_NOTIFICATION":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "MORTALITY_ALERT":
    case "EXPENSE_WARNING":
    case "FARM_ALERT":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "VACCINATION_ALERT":
    case "REMINDER_ALERT":
    case "VACCINATION_REMINDER":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "CHAT_MESSAGE":
      return "border-l-blue-500";
    case "BATCH_UPDATE":
    case "SALES_NOTIFICATION":
      return "border-l-green-500";
    case "MORTALITY_ALERT":
    case "EXPENSE_WARNING":
    case "FARM_ALERT":
      return "border-l-red-500";
    case "VACCINATION_ALERT":
    case "REMINDER_ALERT":
    case "VACCINATION_REMINDER":
      return "border-l-orange-500";
    default:
      return "border-l-gray-500";
  }
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: NotificationData; 
  onMarkAsRead: (id: string) => void;
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to relevant page if URL is provided
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
  };

  return (
    <div
      className={`p-3 border-l-4 ${getNotificationColor(notification.type)} ${
        !notification.read ? 'bg-blue-50/50' : 'bg-gray-50/50'
      } hover:bg-gray-100/50 cursor-pointer transition-colors`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.body}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
  const {
    notifications,
    unreadCount,
    isLoadingNotifications,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((notification: NotificationData) => {
    if (filter === 'unread') {
      return !notification.read;
    }
    return true;
  });

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end p-4">
      <Card className="w-full max-w-md max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="px-6 pb-3">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
          </div>
        </div>

        <Separator />

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[400px]">
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-gray-500">Loading notifications...</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <BellOff className="h-8 w-8 text-gray-400 mb-2" />
                <div className="text-sm text-gray-500">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification: NotificationData) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
