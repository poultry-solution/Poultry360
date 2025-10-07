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
import {
  useCurrentConversation,
  useMessageInput,
  useTypingIndicator,
} from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import {
  useDeleteMessage,
  useEditMessage,
} from "@/fetchers/message/messageQueries";

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement image upload to server
    // For now, just send a text message about the image
    const imageMessage = `[Image: ${file.name}]`;
    sendMessage(imageMessage, "IMAGE");
  };

  const editMessageMutation = useEditMessage(conversationId);
  const deleteMessageMutation = useDeleteMessage(conversationId);

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

            {/* Message Input */}
            <ChatInputBar
              isDoctor={true}
              text={text}
              setText={setText}
              handleKeyPress={handleKeyPress}
              handleTyping={() => {}}
              isConnected={isConnected}
              openShareModal={() => {}}
              sendMessageHandler={() => handleSend()}
              canSend={!!text.trim()}
              handleImageUpload={handleImageUpload}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
