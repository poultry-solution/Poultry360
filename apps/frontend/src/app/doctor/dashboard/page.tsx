"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// Import modular components
import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { DoctorWelcomeBanner } from "@/components/doctor/DoctorWelcomeBanner";
import { DoctorStatsCards } from "@/components/doctor/DoctorStatsCards";
import { PendingRequestsSection } from "@/components/doctor/PendingRequestsSection";
import { NewMessagesCard } from "@/components/doctor/NewMessagesCard";
import { ActiveChatsModal } from "@/components/doctor/modals/ActiveChatsModal";
import { PendingRequestsModal } from "@/components/doctor/modals/PendingRequestsModal";

// Import hooks and services
import {
  useConversationsList,
  useUnreadCounts,
  useChatConnection,
  useDoctorStatus,
  useUpdateDoctorStatus,
} from "@/common/hooks/useChat";
import { useAuth } from "@/common/store/store";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { getSocketService } from "@/common/services/chatservices/socketService";

const socketService = getSocketService();

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showActiveChats, setShowActiveChats] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  // Only fetch chat data if authenticated
  const { conversations, isLoading: conversationsLoading } =
    useConversationsList(isAuthenticated ? { status: "ACTIVE" } : undefined);
  const { unreadCounts, totalUnread } = useUnreadCounts();
  const { isConnected } = useChatConnection();
  const queryClient = useQueryClient();

  // Doctor status management hooks
  const { data: doctorStatus, isLoading: statusLoading } = useDoctorStatus();
  const updateStatusMutation = useUpdateDoctorStatus();
  const [isUpdating, setIsUpdating] = useState(false);

  // Real-time message updates
  useEffect(() => {
    if (
      !isConnected ||
      !isAuthenticated ||
      !conversations ||
      conversations.length === 0
    )
      return;

    const handleNewMessage = (message: any) => {
      console.log("📨 [Doctor Dashboard] New message received:", message);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
    };

    const handleMessageRead = (data: any) => {
      console.log("✅ [Doctor Dashboard] Message read:", data);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
    };

    socketService.on("new_message", handleNewMessage);
    socketService.on("messages_read", handleMessageRead);

    console.log(
      `🔌 [Doctor Dashboard] Joining ${conversations.length} conversation rooms`
    );
    conversations.forEach((conv: any) => {
      socketService.emit("join_conversation", { conversationId: conv.id });
    });

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("messages_read", handleMessageRead);
    };
  }, [isConnected, isAuthenticated, conversations, queryClient]);

  const pendingConversations =
    conversations?.filter(
      (conv: any) => conv.status === "ACTIVE" && !conv.hasDoctorMessaged
    ) || [];

  const activeConversations =
    conversations?.filter(
      (conv: any) => conv.status === "ACTIVE" && conv.hasDoctorMessaged
    ) || [];

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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAcceptRequest = (conversationId: string) => {
    router.push(`/doctor/dashboard/chat/${conversationId}`);
  };

  const handleToggleOnlineStatus = async () => {
    if (!doctorStatus?.user) return;

    const newStatus = !doctorStatus.user.isOnline;
    setIsUpdating(true);

    try {
      await updateStatusMutation.mutateAsync(newStatus);
      console.log(
        `Doctor status updated to: ${newStatus ? "online" : "offline"}`
      );
      // Emit presence over socket
      socketService.updateOnlineStatus(newStatus);
      // If backend presence is tied to active socket connection, disconnect when going offline
      if (!newStatus && isConnected) {
        socketService.disconnect();
      }
    } catch (error) {
      console.error("Failed to update online status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const handleEditProfile = () => {
    console.log("Edit profile...");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <DoctorHeader
        user={user}
        totalUnread={totalUnread}
        doctorStatus={doctorStatus}
        statusLoading={statusLoading}
        isUpdating={isUpdating}
        onToggleStatus={handleToggleOnlineStatus}
        onLogout={handleLogout}
        onEditProfile={handleEditProfile}
      />

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Banner */}
        <DoctorWelcomeBanner
          userName={user?.name || null}
          doctorStatus={doctorStatus}
          statusLoading={statusLoading}
        />

        {/* Stats Cards */}
        <DoctorStatsCards
          stats={todayStats}
          statusLoading={statusLoading}
          doctorStatus={doctorStatus}
          onLedgerClick={() => router.push("/doctor/dashboard/ledger")}
          onActiveChatsClick={() => setShowActiveChats(true)}
          onPendingRequestsClick={() => setShowPendingRequests(true)}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pending Requests - 2/3 width */}
          <div className="lg:col-span-2">
            <PendingRequestsSection
              pendingConversations={pendingConversations}
              conversationsLoading={conversationsLoading}
              onAcceptRequest={handleAcceptRequest}
              formatTime={formatTime}
            />
          </div>

          {/* Right Sidebar - New Messages */}
          <div className="lg:col-span-1 space-y-6">
            {/* New Messages */}
            <NewMessagesCard
              newMessageConversations={newMessageConversations}
              unreadCount={totalUnread}
              statusLoading={statusLoading}
              doctorStatus={doctorStatus}
              onConversationClick={handleAcceptRequest}
              formatTime={formatTime}
            />
          </div>
        </div>

        {/* Modals */}
        <ActiveChatsModal
          isOpen={showActiveChats}
          onClose={() => setShowActiveChats(false)}
          activeConversations={activeConversations}
          onOpenChat={(conversationId) => {
            setShowActiveChats(false);
            router.push(`/doctor/dashboard/chat/${conversationId}`);
          }}
        />

        <PendingRequestsModal
          isOpen={showPendingRequests}
          onClose={() => setShowPendingRequests(false)}
          pendingConversations={pendingConversations}
          onAcceptRequest={(conversationId) => {
            setShowPendingRequests(false);
            handleAcceptRequest(conversationId);
          }}
        />
      </div>
    </div>
  );
}