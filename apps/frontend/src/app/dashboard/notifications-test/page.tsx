"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function NotificationsTestPage() {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [testTitle, setTestTitle] = useState("Test Notification");
  const [testBody, setTestBody] = useState("This is a test notification from Poultry360");
  const [testType, setTestType] = useState("SYSTEM");

  const {
    permission,
    isSupported,
    isSubscribed,
    unreadCount,
    initializeNotifications,
    requestPermission,
    clearSubscription,
    sendTestNotification,
    isSendingTest,
  } = useNotifications();

  const handleSendTest = () => {
    sendTestNotification({
      title: testTitle,
      body: testBody,
      type: testType,
    });
  };

  const getStatusIcon = () => {
    if (!isSupported) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    if (permission === 'denied') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    if (permission === 'default') {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    
    if (isSubscribed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    return <BellOff className="h-5 w-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (!isSupported) {
      return "Not Supported";
    }
    
    if (permission === 'denied') {
      return "Permission Denied";
    }
    
    if (permission === 'default') {
      return "Permission Not Requested";
    }
    
    if (isSubscribed) {
      return "Active";
    }
    
    return "Not Subscribed";
  };

  const getStatusColor = () => {
    if (!isSupported || permission === 'denied') {
      return "destructive";
    }
    
    if (permission === 'default') {
      return "secondary";
    }
    
    if (isSubscribed) {
      return "default";
    }
    
    return "outline";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notification System Test</h1>
        <NotificationBell />
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Support Status</Label>
              <div className="mt-1">
                <Badge variant={isSupported ? "default" : "destructive"}>
                  {isSupported ? "Supported" : "Not Supported"}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Permission</Label>
              <div className="mt-1">
                <Badge variant={getStatusColor()}>
                  {permission}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Subscription</Label>
              <div className="mt-1">
                <Badge variant={isSubscribed ? "default" : "outline"}>
                  {isSubscribed ? "Subscribed" : "Not Subscribed"}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Unread Count</Label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {unreadCount}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {permission === 'default' && (
              <Button onClick={requestPermission}>
                <Bell className="h-4 w-4 mr-2" />
                Request Permission
              </Button>
            )}
            
            {permission === 'granted' && !isSubscribed && (
              <Button onClick={initializeNotifications}>
                <Bell className="h-4 w-4 mr-2" />
                Subscribe to Notifications
              </Button>
            )}
            
            {isSubscribed && (
              <Button 
                variant="destructive" 
                onClick={clearSubscription}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Clear Subscription
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => setIsNotificationCenterOpen(true)}
            >
              Open Notification Center
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Notification Card */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-title">Title</Label>
              <Input
                id="test-title"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            
            <div>
              <Label htmlFor="test-type">Type</Label>
              <Input
                id="test-type"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                placeholder="Notification type"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="test-body">Body</Label>
            <Input
              id="test-body"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              placeholder="Notification body"
            />
          </div>
          
          <Button 
            onClick={handleSendTest}
            disabled={isSendingTest || !isSubscribed}
            className="w-full"
          >
            {isSendingTest ? "Sending..." : "Send Test Notification"}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. <strong>Check Support:</strong> Ensure your browser supports push notifications</p>
          <p>2. <strong>Request Permission:</strong> Click "Request Permission" to enable notifications</p>
          <p>3. <strong>Subscribe:</strong> Click "Subscribe to Notifications" to register for push notifications</p>
          <p>4. <strong>Send Test:</strong> Use the form above to send a test notification</p>
          <p>5. <strong>Check Notifications:</strong> Click the bell icon to view notification center</p>
          <p>6. <strong>Test Offline:</strong> Close the tab and send another test notification</p>
        </CardContent>
      </Card>

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </div>
  );
}
