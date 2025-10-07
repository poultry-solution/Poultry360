"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  Image,
  Paperclip,
  MoreVertical,
  Share2,
  Search,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  useCurrentConversation,
  useMessageInput,
  useChatConnection,
} from "@/hooks/useChat";
import { toast } from "sonner";
import ShareBatchModal from "@/components/chat/ShareBatchModal";
import ChatInputBar from "@/components/chat/ChatInputBar";
import MessageList from "@/components/chat/MessageList";
import ChatHeader from "@/components/chat/ChatHeader";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useCreateBatchShare } from "@/fetchers/batchShare/batchShareQueries";
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
import { X } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real chat hooks
  const { isConnected, error: connectionError } = useChatConnection();
  const {
    conversation,
    messages,
    isLoading,
    error,
    typingUsers,
    onlineUsers,
    sendMessage,
    handleTyping,
    markAsRead,
  } = useCurrentConversation(chatId);

  const {
    text,
    setText,
    sendMessage: sendMessageHandler,
    handleKeyPress,
    canSend,
  } = useMessageInput(chatId);

  // Share Batch Modal state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [expiresIn, setExpiresIn] = useState<"never" | "1d" | "7d" | "30d">(
    "7d"
  );
  const [batchFilter, setBatchFilter] = useState<
    "ALL" | "ACTIVE" | "COMPLETED"
  >("ALL");
  const [batchSearch, setBatchSearch] = useState("");
  const createShareMutation = useCreateBatchShare();

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
  const { data: batchesResponse } = useGetAllBatches();
  const allBatches = (batchesResponse?.data || []) as any[];
  const filteredBatches = allBatches
    .filter((b) => (batchFilter === "ALL" ? true : b.status === batchFilter))
    .filter((b) => {
      if (!batchSearch.trim()) return true;
      const q = batchSearch.trim().toLowerCase();
      return (
        (b.batchNumber || "").toLowerCase().includes(q) ||
        (b.farm?.name || "").toLowerCase().includes(q)
      );
    });

  // axiosInstance is configured; no need for manual backend base here

  // Mark messages as read when conversation loads or when new messages arrive
  useEffect(() => {
    if (chatId && isConnected && messages.length > 0) {
      markAsRead();
    }
  }, [chatId, isConnected, messages.length, markAsRead]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      toast.error(`Connection Error: ${connectionError}`);
    }
  }, [connectionError]);

  // Handle conversation errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load conversation");
      console.error("Conversation error:", error);
    }
  }, [error]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper: Determine message type from MIME
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

  // Helper: Get image dimensions
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

  // Helper: Get video dimensions/duration
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

  // Step 1-3: Upload flow
  const handleFileUpload = async (file: File) => {
    if (!file || !chatId) return;

    try {
      setIsUploading(true);

      // Get file metadata
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

      // Step 1: Get presigned upload URL
      const { uploadUrl, attachmentKey, expires } =
        await generateUploadUrl.mutateAsync({
          conversationId: chatId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          width,
          height,
          durationMs,
        });

      console.log("uploadUrl", uploadUrl);

      // Step 2: Upload to R2
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

      // Step 3: Verify upload and get view URL
      const { success, attachmentUrl } = await verifyUpload.mutateAsync({
        attachmentKey,
      });

      if (!success || !attachmentUrl) {
        throw new Error("Upload verification failed");
      }

      // Step 4: Set preview
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
      // Delete file from R2 storage
      await deleteFile.mutateAsync(attachmentPreview.key);
      console.log("File deleted from R2:", attachmentPreview.key);
      toast.success("Attachment removed");
    } catch (error) {
      console.error("Failed to delete file:", error);
      // Still clear the preview even if delete fails
      toast.warning(
        "Attachment removed from preview (file may remain in storage)"
      );
    } finally {
      setAttachmentPreview(null);
    }
  };

  // Handle voice recording complete
  const handleVoiceRecordingComplete = async (
    audioBlob: Blob,
    duration: number
  ) => {
    try {
      setIsUploading(true);

      // Create a file from the blob
      const fileName = `voice-message-${Date.now()}.webm`;
      const audioFile = new File([audioBlob], fileName, {
        type: "audio/webm",
      });

      // Step 1: Get presigned upload URL
      const { uploadUrl, attachmentKey } =
        await generateUploadUrl.mutateAsync({
          conversationId: chatId,
          fileName,
          contentType: "audio/webm",
          fileSize: audioFile.size,
          durationMs: duration * 1000, // Convert seconds to milliseconds
        });

      // Step 2: Upload to R2
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

      // Step 3: Verify upload and send message
      const { success, attachmentUrl } = await verifyUpload.mutateAsync({
        attachmentKey,
      });

      if (!success || !attachmentUrl) {
        throw new Error("Upload verification failed");
      }

      // Step 4: Send message with audio attachment
      await sendMessageMutation.mutateAsync({
        conversationId: chatId,
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

  const formatTime = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Slash command to open share dialog
  useEffect(() => {
    const v = (text || "").trim().toLowerCase();
    if (v === "/share") {
      setIsShareOpen(true);
      setText("");
    }
  }, [text, setText]);

  const openShareModal = () => setIsShareOpen(true);

  // Edit/Delete/Send message mutations
  const editMessageMutation = useEditMessage(chatId);
  const deleteMessageMutation = useDeleteMessage(chatId);
  const sendMessageMutation = useSendMessage();

  // Custom send handler that supports attachments
  const handleSendMessage = async () => {
    if (attachmentPreview) {
      // Send via API with attachment
      try {
        await sendMessageMutation.mutateAsync({
          conversationId: chatId,
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
      // Send text-only via socket (default behavior)
      sendMessageHandler();
    }
  };

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

  const submitShare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBatchId) {
      toast.error("Please select a batch to share");
      return;
    }
    try {
      const res = await createShareMutation.mutateAsync({
        batchId: selectedBatchId,
        title: shareTitle || undefined,
        description: shareNote || undefined,
        expiresIn,
        conversationId: chatId,
      });

      console.log("res", res);
      const token = (res as any)?.shareToken;
      if (!token) throw new Error("No share token returned");

      const messageToBeSent = `BATCH_SHARE:${token}`;
      // Send message directly without setting text state
      sendMessage(messageToBeSent);

      toast.success("Batch shared in chat");
      setIsShareOpen(false);
      setSelectedBatchId("");
      setShareTitle("");
      setShareNote("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to share batch");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {error ? "Failed to load conversation" : "Conversation not found"}
          </p>
          <Button onClick={() => router.push("/dashboard/chat-doctor")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <Card className="rounded-b-none border-b-0">
        <ChatHeader
          title={conversation?.doctor?.name || "Unknown Doctor"}
          subtitle="Veterinary Doctor"
          isOnline={conversation?.doctor?.isOnline}
          onBack={() => router.push("/dashboard/chat-doctor")}
        />
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 rounded-none border-0">
        <CardContent className="p-0 h-full">
          <div className="h-full flex flex-col">
            {/* Messages Area */}
            <MessageList
              messages={messages as any}
              typingUsers={typingUsers}
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
                text={text}
                setText={setText}
                handleKeyPress={handleKeyPress}
                handleTyping={handleTyping}
                isConnected={isConnected}
                openShareModal={openShareModal}
                sendMessageHandler={handleSendMessage}
                canSend={canSend || !!attachmentPreview}
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

      {/* Share Batch Modal */}
      <ShareBatchModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        filteredBatches={filteredBatches}
        selectedBatchId={selectedBatchId}
        setSelectedBatchId={setSelectedBatchId}
        batchFilter={batchFilter}
        setBatchFilter={setBatchFilter}
        batchSearch={batchSearch}
        setBatchSearch={setBatchSearch}
        shareTitle={shareTitle}
        setShareTitle={setShareTitle}
        shareNote={shareNote}
        setShareNote={setShareNote}
        expiresIn={expiresIn}
        setExpiresIn={setExpiresIn}
        isSubmitting={createShareMutation.isPending}
        onSubmit={submitShare}
      />
    </div>
  );
}
