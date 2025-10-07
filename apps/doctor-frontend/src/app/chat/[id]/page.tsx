"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Image, Paperclip, Share2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInputBar from "@/components/chat/ChatInputBar";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import {
  useCurrentConversation,
  useMessageInput,
  useTypingIndicator,
} from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import {
  useDeleteMessage,
  useEditMessage,
  useSendMessage,
} from "@/fetchers/message/messageQueries";
import {
  useGenerateChatUploadUrl,
  useVerifyChatUpload,
  useDeleteUploadedFile,
} from "@/fetchers/s3/s3Queries";
import { useDeleteConversation } from "@/services/chatservices/chatQueries";
import { toast } from "sonner";

export default function DoctorChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

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

  const generateUploadUrl = useGenerateChatUploadUrl();
  const verifyUpload = useVerifyChatUpload();
  const deleteFile = useDeleteUploadedFile();

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

  // File upload handler
  const handleFileUpload = async (file: File) => {
    if (!file || !conversationId) return;

    try {
      setIsUploading(true);

      const messageType = getMessageType(file.type);
      let width, height, durationMs;

      if (messageType === "IMAGE") {
        const dims = await getImageDimensions(file);
        width = dims.width;
        height = dims.height;
      } else if (messageType === "VIDEO") {
        const dims = await getVideoDimensions(file);
        width = dims.width;
        height = dims.height;
        durationMs = dims.durationMs;
      }

      const { uploadUrl, attachmentKey } =
        await generateUploadUrl.mutateAsync({
          conversationId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          width,
          height,
          durationMs,
        });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { success, attachmentUrl } = await verifyUpload.mutateAsync({
        attachmentKey,
      });

      if (!success || !attachmentUrl) {
        throw new Error("Upload verification failed");
      }

      setAttachmentPreview({
        key: attachmentKey,
        url: attachmentUrl,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        type: messageType,
        width,
        height,
        durationMs,
      });
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

    try {
      await deleteFile.mutateAsync(attachmentPreview.key);
      toast.success("Attachment removed");
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.warning(
        "Attachment removed from preview (file may remain in storage)"
      );
    } finally {
      setAttachmentPreview(null);
    }
  };

  // Voice recording handler
  const handleVoiceRecordingComplete = async (
    audioBlob: Blob,
    duration: number
  ) => {
    try {
      setIsUploading(true);

      const fileName = `voice-message-${Date.now()}.webm`;
      const audioFile = new File([audioBlob], fileName, {
        type: "audio/webm",
      });

      const { uploadUrl, attachmentKey } =
        await generateUploadUrl.mutateAsync({
          conversationId,
          fileName,
          contentType: "audio/webm",
          fileSize: audioFile.size,
          durationMs: duration * 1000,
        });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: audioFile,
        headers: {
          "Content-Type": "audio/webm",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload voice message to storage");
      }

      const { success, attachmentUrl } = await verifyUpload.mutateAsync({
        attachmentKey,
      });

      if (!success || !attachmentUrl) {
        throw new Error("Upload verification failed");
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        text: undefined,
        messageType: "AUDIO",
        attachmentKey,
        fileName,
        contentType: "audio/webm",
        fileSize: audioFile.size,
        durationMs: duration * 1000,
      });

      setIsVoiceRecording(false);
      toast.success("Voice message sent");
    } catch (error: any) {
      console.error("Voice upload error:", error);
      toast.error(error?.message || "Failed to send voice message");
    } finally {
      setIsUploading(false);
    }
  };

  const editMessageMutation = useEditMessage(conversationId);
  const deleteMessageMutation = useDeleteMessage(conversationId);
  const sendMessageMutation = useSendMessage();
  const deleteConversationMutation = useDeleteConversation();

  const handleEditMessage = (m: any) => {
    const current = (m?.text || "").toString();
    const next = window.prompt("Edit message", current);
    if (next === null || next.trim() === current.trim()) return;
    editMessageMutation.mutate({ messageId: m.id, text: next.trim() });
  };

  const handleDeleteMessage = (m: any) => {
    if (!window.confirm("Delete this message?")) return;
    deleteMessageMutation.mutate(m.id);
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      toast.success("Conversation deleted successfully");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete conversation");
    }
  };

  // Custom send handler for attachments
  const handleSendMessage = async () => {
    if (attachmentPreview) {
      try {
        await sendMessageMutation.mutateAsync({
          conversationId,
          text: text.trim() || undefined,
          messageType: attachmentPreview.type,
          attachmentKey: attachmentPreview.key,
          fileName: attachmentPreview.fileName,
          contentType: attachmentPreview.contentType,
          fileSize: attachmentPreview.fileSize,
          width: attachmentPreview.width,
          height: attachmentPreview.height,
          durationMs: attachmentPreview.durationMs,
        });
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
          <Button onClick={() => router.push("/dashboard")}>
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
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Chat Header */}
      <Card className="rounded-b-none border-b-0">
        <ChatHeader
          title={conversation?.farmer?.name || "Unknown Farmer"}
          subtitle={conversation?.subject || "Veterinary Consultation"}
          isOnline={isConnected}
          onBack={() => router.push("/dashboard")}
          onDelete={handleDeleteConversation}
        />
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 rounded-none border-0">
        <CardContent className="p-0 h-full">
          <div className="h-full flex flex-col">
            {/* Messages Area */}
            <MessageList
              isDoctor={true}
              userId={user?.id || ""}
              messages={messages as any}
              typingUsers={isAnyoneTyping ? typingUsers : []}
              endRef={messagesEndRef}
              formatTime={formatTime}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />

            {/* Message Input or Voice Recorder */}
            {isVoiceRecording ? (
              <div className="p-4 border-t">
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsVoiceRecording(false)}
                  isUploading={isUploading}
                />
              </div>
            ) : (
              <ChatInputBar
                isDoctor={true}
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
