"use client";

import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import ChatHeader from "@/common/components/chat/ChatHeader";
import MessageList from "@/common/components/chat/MessageList";
import ChatInputBar from "@/common/components/chat/ChatInputBar";
import VoiceRecorder from "@/common/components/chat/VoiceRecorder";
import {
  useCurrentConversation,
  useMessageInput,
  useTypingIndicator,
} from "@/common/hooks/useChat";
import { useAuth } from "@/common/store/store";
import { useChat as useChatCtx } from "@/common/contexts/ChatContext";
import { toast } from "sonner";

export default function DoctorChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isUserOnline, onlineUsers } = useChatCtx();

  // Real-time chat hooks
  const {
    conversation,
    messages,
    isLoading,
    error,
    isConnected,
    sendMessage,
    markAsRead,
  } = useCurrentConversation(conversationId);

  const {
    text,
    setText,
    sendMessage: handleSend,
    handleKeyPress,
    isTyping,
  } = useMessageInput(conversationId);

  const { typingUsers, isAnyoneTyping, typingText } =
    useTypingIndicator(conversationId);

  // Media upload state
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    key: string;
    url: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    type: "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "DOC" | "OTHER";
    width?: number;
    height?: number;
    durationMs?: number;
  } | null>(null);

  // Voice recording state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when component mounts or when new messages arrive
  useEffect(() => {
    if (conversationId && isConnected && messages.length > 0) {
      markAsRead();
    }
  }, [conversationId, isConnected, messages.length, markAsRead]);

  // Helper functions
  const getMessageType = (
    mimeType: string
  ): "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "DOC" | "OTHER" => {
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    if (mimeType.startsWith("audio/")) return "AUDIO";
    if (mimeType === "application/pdf") return "PDF";
    if (
      mimeType.includes("word") ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    )
      return "DOC";
    return "OTHER";
  };

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = URL.createObjectURL(file);
    });
  };

  const getVideoDimensions = (
    file: File
  ): Promise<{ width: number; height: number; durationMs: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationMs: Math.floor(video.duration * 1000),
        });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve({ width: 0, height: 0, durationMs: 0 });
      video.src = URL.createObjectURL(file);
    });
  };

  // File upload handler (simplified for now - will need to implement S3 upload hooks)
  const handleFileUpload = async (file: File) => {
    if (!file || !conversationId) return;

    try {
      setIsUploading(true);
      // TODO: Implement file upload with S3 hooks
      console.log("File upload not yet implemented:", file.name);
      toast.error("File upload not yet implemented");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const clearAttachment = async () => {
    if (!attachmentPreview) return;
    setAttachmentPreview(null);
    toast.success("Attachment removed");
  };

  // Voice recording handler (simplified for now)
  const handleVoiceRecordingComplete = async (
    audioBlob: Blob,
    duration: number
  ) => {
    try {
      setIsUploading(true);
      // TODO: Implement voice message upload
      console.log("Voice message not yet implemented");
      toast.error("Voice message not yet implemented");
    } catch (error: any) {
      console.error("Voice upload error:", error);
      toast.error(error?.message || "Failed to send voice message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditMessage = (m: any) => {
    const current = (m?.text || "").toString();
    const next = window.prompt("Edit message", current);
    if (next === null || next.trim() === current.trim()) return;
    // TODO: Implement message editing
    console.log("Message editing not yet implemented");
  };

  const handleDeleteMessage = (m: any) => {
    if (!window.confirm("Delete this message?")) return;
    // TODO: Implement message deletion
    console.log("Message deletion not yet implemented");
  };

  const handleDeleteConversation = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this conversation? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      // TODO: Implement conversation deletion
      console.log("Conversation deletion not yet implemented");
      toast.success("Conversation deleted successfully");
      router.push("/doctor/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete conversation");
    }
  };

  // Custom send handler for attachments
  const handleSendMessage = async () => {
    if (attachmentPreview) {
      try {
        // TODO: Implement attachment sending
        console.log("Attachment sending not yet implemented");
        setText("");
        setAttachmentPreview(null);
        toast.success("Message sent");
      } catch (error: any) {
        console.error("Send error:", error);
        toast.error("Failed to send message");
      }
    } else {
      handleSend();
    }
  };

  const formatTime = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            Error loading conversation: {error.message}
          </p>
          <Button onClick={() => router.push("/doctor/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Conversation not found</p>
          <Button onClick={() => router.push("/doctor/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
      {/* Chat Header - Fixed */}
      <Card className="rounded-b-none border-b-0 flex-shrink-0">
        <ChatHeader
          title={conversation?.farmer?.name || "Unknown Farmer"}
          subtitle={conversation?.subject || "Veterinary Consultation"}
          isOnline={(conversation?.farmer?.id && isUserOnline(conversation?.farmer?.id))
            || (conversation?.farmer?.id ? (onlineUsers[conversationId] || []).includes(conversation?.farmer?.id) : false)
            || !!conversation?.farmer?.isOnline}
          onBack={() => router.push("/doctor/dashboard")}
          onDelete={handleDeleteConversation}
        />
      </Card>

      {/* Chat Messages - Scrollable Area */}
      <Card className="flex-1 rounded-none border-0 overflow-hidden flex flex-col">
        <CardContent className="p-0 h-full flex flex-col overflow-hidden">
          {/* Messages Area - Only this scrolls */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <MessageList
              messages={messages as any}
              typingUsers={isAnyoneTyping ? typingUsers : []}
              endRef={messagesEndRef}
              formatTime={formatTime}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              currentUserId={user?.id}
            />
          </div>

          {/* Message Input or Voice Recorder - Fixed */}
          <div className="flex-shrink-0 border-t bg-background">
            {isVoiceRecording ? (
              <div className="p-4">
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsVoiceRecording(false)}
                  isUploading={isUploading}
                />
              </div>
            ) : (
              <ChatInputBar
                text={text}
                setText={setText}
                handleKeyPress={handleKeyPress}
                handleTyping={() => {}}
                isConnected={isConnected}
                openShareModal={() => {}}
                sendMessageHandler={handleSendMessage}
                canSend={!!text.trim() || !!attachmentPreview}
                handleImageUpload={handleImageUpload}
                handleFileUpload={handleFileInputChange}
                attachmentPreview={attachmentPreview}
                clearAttachment={clearAttachment}
                isUploading={isUploading}
                onVoiceClick={() => setIsVoiceRecording(true)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
