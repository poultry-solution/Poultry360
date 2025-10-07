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
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useCreateBatchShare } from "@/fetchers/batchShare/batchShareQueries";
import { useDeleteMessage, useEditMessage } from "@/fetchers/message/messageQueries";

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement image upload to server
    toast.info("Image upload feature coming soon!");
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

  // Edit/Delete message mutations
  const editMessageMutation = useEditMessage(chatId);
  const deleteMessageMutation = useDeleteMessage(chatId);

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

            {/* Message Input */}
            <ChatInputBar
              text={text}
              setText={setText}
              handleKeyPress={handleKeyPress}
              handleTyping={handleTyping}
              isConnected={isConnected}
              openShareModal={openShareModal}
              sendMessageHandler={() => sendMessageHandler()}
              canSend={canSend}
              handleImageUpload={handleImageUpload}
            />
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
