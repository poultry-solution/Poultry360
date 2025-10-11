"use client";

import { useState, useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Bell, BellOff, Settings } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCenter } from "./NotificationCenter";

export const NotificationBell = () => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] =
    useState(false);
  const {
    permission,
    isSupported,
    isSubscribed,
    unreadCount,
    initializeNotifications,
    requestPermission,
  } = useNotifications();

  // Check for existing subscription on mount (but don't auto-subscribe)
  useEffect(() => {
    if (isSupported && permission === "default") {
      console.log(
        "Push notifications supported but permission not requested yet"
      );
    } else if (isSupported && permission === "granted") {
      console.log("Permission granted, checking for existing subscription...");
      // The useNotifications hook will automatically check for existing subscriptions
      // but won't create new ones without explicit user action
    }
  }, [isSupported, permission]);

  const handleBellClick = async () => {
    if (!isSupported) {
      alert("Push notifications are not supported in this browser");
      return;
    }

    if (permission === "default") {
      try {
        const newPermission = await requestPermission();
        if (newPermission === "granted") {
          await initializeNotifications();
        }
      } catch (error) {
        console.error("Failed to request notification permission:", error);
        alert(
          "Failed to enable notifications. Please check your browser settings."
        );
      }
    } else {
      setIsNotificationCenterOpen(true);
    }
  };

  const getBellIcon = () => {
    if (!isSupported) {
      return <BellOff className="h-5 w-5 text-gray-400" />;
    }

    if (permission === "denied") {
      return <BellOff className="h-5 w-5 text-red-500" />;
    }

    if (permission === "default") {
      return <Bell className="h-5 w-5 text-gray-500" />;
    }

    return <Bell className="h-5 w-5 text-blue-500" />;
  };

  const getTooltipText = () => {
    if (!isSupported) {
      return "Push notifications not supported";
    }

    if (permission === "denied") {
      return "Notifications blocked - enable in browser settings";
    }

    if (permission === "default") {
      return "Click to enable notifications";
    }

    if (!isSubscribed) {
      return "Setting up notifications...";
    }

    return "Notifications enabled";
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBellClick}
          className="relative p-2"
          title={getTooltipText()}
        >
          {getBellIcon()}

          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </>
  );
};
