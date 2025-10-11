"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { ScrollArea } from "@/common/components/ui/scroll-area";
import { Separator } from "@/common/components/ui/separator";
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
  Trash2,
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
      return <MessageSquare className="h-5 w-5" />;
    case "BATCH_UPDATE":
    case "SALES_NOTIFICATION":
      return <TrendingUp className="h-5 w-5" />;
    case "MORTALITY_ALERT":
    case "EXPENSE_WARNING":
    case "FARM_ALERT":
      return <AlertTriangle className="h-5 w-5" />;
    case "VACCINATION_ALERT":
    case "REMINDER_ALERT":
    case "VACCINATION_REMINDER":
      return <AlertCircle className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getNotificationStyle = (type: string) => {
  switch (type) {
    case "CHAT_MESSAGE":
      return {
        bg: "bg-blue-50",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        border: "border-blue-200"
      };
    case "BATCH_UPDATE":
    case "SALES_NOTIFICATION":
      return {
        bg: "bg-emerald-50",
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        border: "border-emerald-200"
      };
    case "MORTALITY_ALERT":
    case "EXPENSE_WARNING":
    case "FARM_ALERT":
      return {
        bg: "bg-red-50",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        border: "border-red-200"
      };
    case "VACCINATION_ALERT":
    case "REMINDER_ALERT":
    case "VACCINATION_REMINDER":
      return {
        bg: "bg-amber-50",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        border: "border-amber-200"
      };
    default:
      return {
        bg: "bg-slate-50",
        iconBg: "bg-slate-100",
        iconColor: "text-slate-600",
        border: "border-slate-200"
      };
  }
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: NotificationData; 
  onMarkAsRead: (id: string) => void;
}) => {
  const style = getNotificationStyle(notification.type);
  
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
  };

  return (
    <div
      className={`group relative p-4 border ${style.border} rounded-xl ${
        !notification.read ? 'bg-white shadow-sm' : 'bg-white'
      } hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 ${style.iconBg} rounded-xl flex items-center justify-center ${style.iconColor}`}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-base font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5 animate-pulse" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {notification.body}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Mark as read
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-end">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      <Card className="relative w-full max-w-lg m-4 max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Notifications</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Stay updated with your activity</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="rounded-lg font-medium"
              >
                All
                <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                  {notifications.length}
                </Badge>
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
                className="rounded-lg font-medium"
              >
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
                className="hover:bg-slate-100 rounded-lg"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[500px]">
            {isLoadingNotifications ? (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-sm font-medium text-gray-600">Loading notifications...</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <BellOff className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </h3>
                <p className="text-sm text-gray-500">
                  {filter === 'unread' 
                    ? "You've read all your notifications" 
                    : "We'll notify you when something important happens"}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
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