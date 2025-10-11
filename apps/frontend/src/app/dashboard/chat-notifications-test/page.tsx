"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { useNotifications } from "@/common/hooks/useNotifications";
import { NotificationCenter } from "@/common/components/notifications/NotificationCenter";
import { NotificationBell } from "@/common/components/notifications/NotificationBell";
import { MessageSquare, Image, Mic, FileText, Share2 } from "lucide-react";
import axiosInstance from "@/common/lib/axios";

interface TestUser {
  id: string;
  name: string;
  role: string;
  hasPushSubscription: boolean;
  notificationsEnabled: boolean;
}

export default function ChatNotificationsTestPage() {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [selectedTargetUser, setSelectedTargetUser] = useState("");
  const [messageType, setMessageType] = useState("TEXT");
  const [messageText, setMessageText] = useState("Hello! This is a test message from the chat notification system.");
  const [isLoading, setIsLoading] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  const {
    permission,
    isSupported,
    isSubscribed,
    unreadCount,
  } = useNotifications();

  // Fetch test users on component mount
  const fetchTestUsers = async () => {
    try {
      const response = await axiosInstance.get('/notifications/test-users');
      setTestUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch test users:', error);
    }
  };

  // Load test users on mount
  useEffect(() => {
    fetchTestUsers();
  }, []);

  const handleSendTestChatNotification = async () => {
    if (!selectedTargetUser) {
      alert('Please select a target user');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/notifications/test-chat', {
        targetUserId: selectedTargetUser,
        messageType,
        messageText
      });

      setLastTestResult(response.data);
      console.log('Test chat notification sent:', response.data);
    } catch (error: any) {
      console.error('Failed to send test chat notification:', error);
      alert('Failed to send test notification: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return <MessageSquare className="h-4 w-4" />;
      case "IMAGE":
        return <Image className="h-4 w-4" />;
      case "AUDIO":
        return <Mic className="h-4 w-4" />;
      case "BATCH_SHARE":
        return <Share2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case "TEXT":
        return "Text Message";
      case "IMAGE":
        return "Photo";
      case "AUDIO":
        return "Voice Message";
      case "BATCH_SHARE":
        return "Batch Share";
      default:
        return "File";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chat Notifications Test</h1>
        <NotificationBell />
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Support</Label>
              <div className="mt-1">
                <Badge variant={isSupported ? "default" : "destructive"}>
                  {isSupported ? "Supported" : "Not Supported"}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Permission</Label>
              <div className="mt-1">
                <Badge variant={permission === 'granted' ? "default" : "secondary"}>
                  {permission}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Subscription</Label>
              <div className="mt-1">
                <Badge variant={isSubscribed ? "default" : "outline"}>
                  {isSubscribed ? "Active" : "Not Active"}
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
        </CardContent>
      </Card>

      {/* Test Chat Notification Card */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Chat Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-user">Target User</Label>
              <Select value={selectedTargetUser} onValueChange={setSelectedTargetUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to send notification to" />
                </SelectTrigger>
                <SelectContent>
                  {testUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {user.hasPushSubscription && (
                          <Badge variant="default" className="text-xs">
                            Push
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="message-type">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon("TEXT")}
                      {getMessageTypeLabel("TEXT")}
                    </div>
                  </SelectItem>
                  <SelectItem value="IMAGE">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon("IMAGE")}
                      {getMessageTypeLabel("IMAGE")}
                    </div>
                  </SelectItem>
                  <SelectItem value="AUDIO">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon("AUDIO")}
                      {getMessageTypeLabel("AUDIO")}
                    </div>
                  </SelectItem>
                  <SelectItem value="BATCH_SHARE">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon("BATCH_SHARE")}
                      {getMessageTypeLabel("BATCH_SHARE")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="message-text">Message Text</Label>
            <Input
              id="message-text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Enter test message text"
              disabled={messageType !== "TEXT"}
            />
          </div>
          
          <Button 
            onClick={handleSendTestChatNotification}
            disabled={isLoading || !selectedTargetUser || !isSubscribed}
            className="w-full"
          >
            {isLoading ? "Sending..." : "Send Test Chat Notification"}
          </Button>

          {lastTestResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">Last Test Result:</h4>
              <p className="text-sm text-green-700">
                Sent to: {lastTestResult.targetUser} from: {lastTestResult.sender}
              </p>
              <p className="text-sm text-green-700">
                Success: {lastTestResult.result?.success ? "Yes" : "No"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Users Card */}
      <Card>
        <CardHeader>
          <CardTitle>Available Test Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {testUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.name}</span>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {user.hasPushSubscription && (
                    <Badge variant="default" className="text-xs">Push Enabled</Badge>
                  )}
                  {user.notificationsEnabled && (
                    <Badge variant="secondary" className="text-xs">Notifications On</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </div>
  );
}
