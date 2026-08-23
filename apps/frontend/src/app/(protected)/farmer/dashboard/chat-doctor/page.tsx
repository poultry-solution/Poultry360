"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { MessageCircle, Clock, User } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useState, useEffect } from "react";
import { Modal } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useRouter } from "next/navigation";
import { useConversationsList, useDoctors, useCreateConversation, useUnreadCounts, useDoctorsWithStatus } from "@/common/hooks/useChat";
import { useChatConnection } from "@/common/hooks/useChat";
import { getSocketService } from "@/common/services/chatservices/socketService";
import { useQueryClient } from "@tanstack/react-query";
import { chatKeys } from "@/common/services/chatservices/chatQueries";
import { toast } from "sonner";

export default function ChatDoctorPage() {
  const router = useRouter();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [chatReason, setChatReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // React Query client for cache invalidation
  const queryClient = useQueryClient();

  // Real chat hooks
  const { isConnected, isLoading: connectionLoading, error: connectionError } = useChatConnection();
  const { conversations, isLoading: conversationsLoading, selectConversation } = useConversationsList();
  const { doctors, onlineDoctors, isLoading: doctorsLoading } = useDoctorsWithStatus();
  const { totalUnread, getUnreadForConversation } = useUnreadCounts();
  const createConversationMutation = useCreateConversation();

  const activeChats = conversations?.filter((conv: any) => conv.status === 'ACTIVE').length || 0;
  const monthlyConsultations = conversations?.length || 0;

  // Listen for real-time doctor status changes
  useEffect(() => {
    if (!isConnected) return;

    const socketService = getSocketService();

    const handleDoctorStatusChange = (data: {
      doctorId: string;
      doctorName: string;
      isOnline: boolean;
      lastSeen: string;
    }) => {
      console.log('Doctor status changed:', data);

      // Invalidate and refetch all doctor-related queries
      queryClient.invalidateQueries({ queryKey: chatKeys.doctors() });
      queryClient.invalidateQueries({ queryKey: [...chatKeys.doctors(), 'online'] });

      // Show toast notification
      toast.info(`Dr. ${data.doctorName} is now ${data.isOnline ? 'online' : 'offline'}`);
    };

    // Listen for doctor status changes
    socketService.onDoctorGlobalStatusChanged(handleDoctorStatusChange);

    // Also listen for general user status changes
    socketService.onGlobalUserStatusChanged((data) => {
      if (data.userRole === 'DOCTOR') {
        handleDoctorStatusChange({
          doctorId: data.userId,
          doctorName: data.userName,
          isOnline: data.isOnline,
          lastSeen: data.timestamp
        });
      }
    });

    return () => {
      socketService.offDoctorGlobalStatusChanged(handleDoctorStatusChange);
      socketService.offGlobalUserStatusChanged(() => { }); // Remove the listener
    };
  }, [isConnected, queryClient]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!chatReason.trim()) {
      newErrors.reason = 'Please provide a reason for consultation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartChat = async () => {
    if (!validateForm() || !selectedDoctor) return;

    try {
      const result = await createConversationMutation.createAndJoin({
        doctorId: selectedDoctor.id,
        subject: chatReason,
        initialMessage: chatReason
      });

      if (result.conversation) {
        toast.success('Conversation started successfully!');
        setIsChatModalOpen(false);

        // Clean up modal state
        setChatReason('');
        setSelectedDoctor(null);

        // Navigate to the conversation (initial message is already sent by backend)
        router.push(`/farmer/dashboard/chat-doctor/${result.conversation.id}`);
      }
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      toast.error(error?.response?.data?.error || 'Failed to start conversation');
    }
  };

  const openChatModal = (doctor: any) => {
    setSelectedDoctor(doctor);
    setChatReason('');
    setErrors({});
    setIsChatModalOpen(true);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Chat with Doctor</h1>
          <p className="text-sm md:text-base text-muted-foreground">Get veterinary advice.</p>
        </div>
        <Button size="sm" className="text-xs md:text-sm bg-primary hover:bg-primary/90 w-full sm:w-auto">
          <MessageCircle className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">New </span>Consultation
        </Button>
      </div>

      {/* Connection Status */}
      {connectionError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">Connection Error: {connectionError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-2 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Online</CardTitle>
            <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {doctorsLoading ? '...' : (onlineDoctors?.length || 0)}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">Doctors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Active</CardTitle>
            <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {conversationsLoading ? '...' : activeChats}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">Chats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Unread</CardTitle>
            <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {totalUnread}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Available Doctors */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg">Doctors</CardTitle>
            <CardDescription className="text-xs md:text-sm">Vets ready for consultation.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {doctorsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-32"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Show all doctors with proper status */}
                {doctors?.map((doctor) => (
                  <div
                    key={doctor.id}
                    className={`flex items-center justify-between p-2 md:p-3 rounded-lg transition-colors ${doctor.isOnline ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${doctor.isOnline ? 'bg-primary' : 'bg-gray-400'
                        }`}>
                        <span className={`font-bold text-xs md:text-sm ${doctor.isOnline ? 'text-primary-foreground' : 'text-white'
                          }`}>
                          {doctor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm md:text-base truncate max-w-[100px] md:max-w-none">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground hidden md:block">{doctor.companyName || 'Veterinary Doctor'}</p>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${doctor.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {doctor.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={doctor.isOnline ? "default" : "outline"}
                      className={`text-xs ${doctor.isOnline ? "bg-primary hover:bg-primary/90" : "text-gray-600"}`}
                      onClick={() => openChatModal(doctor)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 md:mr-1" />
                      <span className="hidden md:inline">Chat</span>
                    </Button>
                  </div>
                ))}

                {(doctors?.length || 0) === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No doctors available at the moment</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg">Recent Consultations</CardTitle>
            <CardDescription className="text-xs md:text-sm">Your latest consultations.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {conversationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-24"></div>
                    </div>
                    <div className="h-6 bg-gray-300 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {conversations?.slice(0, 5).map((conversation: any) => {
                  const unreadCount = getUnreadForConversation(conversation.id);
                  return (
                    <div
                      key={conversation.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        selectConversation(conversation.id);
                        router.push(`/farmer/dashboard/chat-doctor/${conversation.id}`);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{conversation.doctor.name}</p>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {conversation.lastMessage?.text || conversation.subject || 'No messages yet'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conversation.lastMessage?.createdAt
                            ? formatTime(conversation.lastMessage.createdAt)
                            : formatTime(conversation.createdAt)
                          }
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className={`${conversation.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : conversation.status === 'CLOSED'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {conversation.status}
                      </Badge>
                    </div>
                  );
                })}
                {(!conversations || conversations.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a chat with a doctor to begin</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Initiation Modal */}
      <Modal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        title="Start Consultation"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                {selectedDoctor?.avatar}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{selectedDoctor?.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedDoctor?.specialty}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Consultation *</Label>
            <Input
              id="reason"
              value={chatReason}
              onChange={(e) => setChatReason(e.target.value)}
              placeholder="Describe your concern or question..."
              className="mt-1"
            />
            {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Please provide a clear description of your concern.
              This helps the doctor understand your situation better and provide more accurate advice.
            </p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Tip:</strong> If you already have an ongoing conversation with this doctor,
              you'll be redirected to that chat and your message will be sent there automatically.
            </p>
          </div>

          {!selectedDoctor?.isOnline && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Doctor is currently offline.</strong> Your message will be delivered when they come back online.
                You can still start the conversation and send your initial message.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsChatModalOpen(false)}
              disabled={createConversationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartChat}
              className="bg-primary hover:bg-primary/90"
              disabled={createConversationMutation.isPending}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {createConversationMutation.isPending ? 'Starting...' : 'Start Chat'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
