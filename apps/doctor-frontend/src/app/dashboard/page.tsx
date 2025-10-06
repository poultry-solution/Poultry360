"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity,
  Plus,
  User,
  LogOut,
  Edit,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useConversationsList,
  useUnreadCounts,
  useChatConnection,
  useDoctorStatus,
  useUpdateDoctorStatus,
} from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import { AppLoadingScreen } from "@/components/loading-screen";

interface ChatRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  requestedAt: string;
  status: "pending" | "active" | "completed";
}

export default function DoctorDashboard() {
  const router = useRouter();
  const {
    user,
    logout,
    isAuthenticated,
    isLoading: authLoading,
    initialize,
  } = useAuthStore();
  const [showActiveChats, setShowActiveChats] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: "",
    date: "",
    time: "",
    type: "Consultation Reminder",
  });
  const [reminders, setReminders] = useState<any[]>([]);

  // Only fetch chat data if authenticated
  const { conversations, isLoading: conversationsLoading } =
    useConversationsList(isAuthenticated ? { status: "ACTIVE" } : undefined);
  const { unreadCounts, totalUnread } = useUnreadCounts();
  const { isConnected } = useChatConnection();

  // Doctor status management
  const { data: doctorStatus, isLoading: statusLoading } = useDoctorStatus();
  const updateStatusMutation = useUpdateDoctorStatus();
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize auth store
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      initialize();
    }
  }, [initialize, isAuthenticated, authLoading]);

  // Grouping logic (server provides hasDoctorMessaged)
  const pendingConversations =
    conversations?.filter(
      (conv: any) => conv.status === "ACTIVE" && !conv.hasDoctorMessaged
    ) || [];

  const activeConversations =
    conversations?.filter(
      (conv: any) => conv.status === "ACTIVE" && conv.hasDoctorMessaged
    ) || [];

  // New messages for active chats: unread messages from farmer
  const newMessageConversations = activeConversations.filter(
    (conv: any) => conv.unreadCount > 0
  );

  const todayStats = {
    totalConsultations: activeConversations.length,
    completedConsultations:
      conversations?.filter((conv) => conv.status === "CLOSED").length || 0,
    activeChats: activeConversations.length,
    pendingRequests: pendingConversations.length,
  };

  // Show loading while auth is initializing
  if (authLoading || !isAuthenticated) {
    return (
      <AppLoadingScreen
        message={
          authLoading
            ? "Initializing authentication..."
            : "Redirecting to login..."
        }
      />
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAcceptRequest = (conversationId: string) => {
    // Navigate to chat page with the conversation ID
    router.push(`/chat/${conversationId}`);
  };

  const handleToggleOnlineStatus = async () => {
    if (!doctorStatus?.user) return;

    const newStatus = !doctorStatus.user.isOnline;
    setIsUpdating(true);

    try {
      // Optimistic update - update the UI immediately
      await updateStatusMutation.mutateAsync(newStatus);

      console.log(
        `Doctor status updated to: ${newStatus ? "online" : "offline"}`
      );
    } catch (error) {
      console.error("Failed to update online status:", error);
      // The error will automatically revert the optimistic update due to the mutation's onError handler
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddReminder = () => {
    if (!reminderForm.title.trim() || !reminderForm.date || !reminderForm.time)
      return;

    const newReminder = {
      id: Date.now(),
      title: reminderForm.title,
      date: reminderForm.date,
      time: reminderForm.time,
      type: reminderForm.type,
    };

    setReminders([...reminders, newReminder]);
    setReminderForm({
      title: "",
      date: "",
      time: "",
      type: "Consultation Reminder",
    });
    setIsReminderModalOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile logic
    console.log("Edit profile...");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    P
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Poultry360</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-white border shadow-lg z-50"
                  >
                    <DropdownMenuItem
                      onClick={handleEditProfile}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant={doctorStatus?.user?.isOnline ? "outline" : "default"}
                  size="sm"
                  onClick={handleToggleOnlineStatus}
                  disabled={isUpdating || statusLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isUpdating
                    ? "Updating..."
                    : statusLoading
                      ? "Loading..."
                      : doctorStatus?.user?.isOnline
                        ? "Go Offline"
                        : "Go Online"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome Dr. {user?.name}</h2>
            <p className="text-muted-foreground">
              Manage your consultations and help farmers
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  doctorStatus?.user?.isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm font-medium">
                {statusLoading
                  ? "Loading..."
                  : doctorStatus?.user?.isOnline
                    ? "Online"
                    : "Offline"}
              </span>
              {doctorStatus?.user?.lastSeen && !doctorStatus.user.isOnline && (
                <span className="text-xs text-muted-foreground">
                  Last seen:{" "}
                  {new Date(doctorStatus.user.lastSeen).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Smaller */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">
                Total Consultations
              </CardTitle>
              <Calendar className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">
                {statusLoading
                  ? "..."
                  : doctorStatus?.stats?.activeConversations ||
                    todayStats.totalConsultations}
              </div>
              <p className="text-xs text-muted-foreground">
                Active consultations
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors py-2"
            onClick={() => router.push("/ledger")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Ledger</CardTitle>
              <BookOpen className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">₹15,240</div>
              <p className="text-xs text-muted-foreground">
                Total transactions
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors py-2"
            onClick={() => setShowActiveChats(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">
                Active Chats
              </CardTitle>
              <MessageCircle className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{todayStats.activeChats}</div>
              <p className="text-xs text-muted-foreground">
                Click to view chats
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors py-2"
            onClick={() => setShowPendingRequests(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">
                Pending Requests
              </CardTitle>
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">
                {todayStats.pendingRequests}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to view requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Chat Requests and Reminders */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pending Chat Requests - Takes 2/3 width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Pending Consultation Requests</span>
                </CardTitle>
                <CardDescription>
                  Farmers waiting for veterinary consultation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      Loading conversations...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">
                                {conversation.farmer.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {conversation.subject || "Consultation Request"}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-orange-100 text-orange-800">
                                {conversation.unreadCount} unread
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(conversation.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {conversation.lastMessage?.text ||
                              "No messages yet"}
                          </p>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() =>
                                handleAcceptRequest(conversation.id)
                              }
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingConversations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pending consultation requests</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - New Messages and Reminders */}
          <div className="lg:col-span-1 space-y-6">
            {/* New Messages Card - Top position */}
            <Card className="h-64 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">New Messages</CardTitle>
                    <CardDescription className="text-xs">
                      Recent farmer messages
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {statusLoading
                      ? "..."
                      : doctorStatus?.stats?.unreadMessages ||
                        newMessageConversations.reduce(
                          (sum, conv) => sum + conv.unreadCount,
                          0
                        )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-3">
                  {newMessageConversations.slice(0, 3).map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-start space-x-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleAcceptRequest(conversation.id)}
                    >
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-foreground font-bold text-xs">
                          {conversation.farmer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {conversation.farmer.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage?.text || "No messages yet"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(conversation.updatedAt)}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  ))}
                  {newMessageConversations.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No new messages</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reminders Card - Bottom position */}
            <Card className="h-64 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Reminders</CardTitle>
                    <CardDescription className="text-xs">
                      Upcoming tasks
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsReminderModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-3">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start space-x-3 p-2 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {reminder.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.date}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.time}
                        </p>
                      </div>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No reminders</p>
                      <Button
                        size="sm"
                        onClick={() => setIsReminderModalOpen(true)}
                        className="mt-2 bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Active Chats Modal */}
        <Modal
          isOpen={showActiveChats}
          onClose={() => setShowActiveChats(false)}
          title="Active Chats"
        >
          <div className="space-y-4">
            {activeConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">
                      {conversation.farmer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {conversation.farmer.name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage?.text
                        ? conversation.lastMessage.text.length > 30
                          ? `${conversation.lastMessage.text.substring(0, 30)}...`
                          : conversation.lastMessage.text
                        : "No messages yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {conversation.unreadCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                    onClick={() => {
                      setShowActiveChats(false);
                      router.push(`/chat/${conversation.id}`);
                    }}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>
            ))}
            {activeConversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active chats</p>
              </div>
            )}
          </div>
        </Modal>

        {/* Pending Requests Modal */}
        <Modal
          isOpen={showPendingRequests}
          onClose={() => setShowPendingRequests(false)}
          title="Pending Consultation Requests"
        >
          <div className="space-y-4">
            {pendingConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">
                      {conversation.farmer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {conversation.farmer.name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage?.text
                        ? conversation.lastMessage.text.length > 30
                          ? `${conversation.lastMessage.text.substring(0, 30)}...`
                          : conversation.lastMessage.text
                        : "No messages yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge className="bg-orange-100 text-orange-800 text-xs">
                    {conversation.unreadCount} unread
                  </Badge>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                    onClick={() => {
                      setShowPendingRequests(false);
                      handleAcceptRequest(conversation.id);
                    }}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
            {pendingConversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            )}
          </div>
        </Modal>

        {/* Add Reminder Modal */}
        <Modal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          title="Add Reminder"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderTitle">Title</Label>
              <Input
                id="reminderTitle"
                value={reminderForm.title}
                onChange={(e) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter reminder title"
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reminderDate">Date</Label>
                <Input
                  id="reminderDate"
                  type="date"
                  value={reminderForm.date}
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reminderTime">Time</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={reminderForm.time}
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reminderType">Reminder Type</Label>
              <select
                id="reminderType"
                value={reminderForm.type}
                onChange={(e) =>
                  setReminderForm((prev) => ({ ...prev, type: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Consultation Reminder">
                  Consultation Reminder
                </option>
                <option value="Follow-up Reminder">Follow-up Reminder</option>
                <option value="Medical Reminder">Medical Reminder</option>
                <option value="Appointment Reminder">
                  Appointment Reminder
                </option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsReminderModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddReminder}
                className="bg-primary hover:bg-primary/90"
              >
                Add Reminder
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
