"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { MessageCircle } from "lucide-react";

interface NewMessagesCardProps {
  newMessageConversations: Array<{
    id: string;
    farmer: {
      name: string;
    };
    lastMessage?: {
      text: string;
    };
    unreadCount: number;
    updatedAt: string;
  }>;
  unreadCount: number;
  statusLoading: boolean;
  doctorStatus: {
    success: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      isOnline: boolean;
      lastSeen: string | null;
    };
    stats: {
      activeConversations: number;
      unreadMessages: number;
    };
  } | undefined;
  onConversationClick: (conversationId: string) => void;
  formatTime: (dateString: string) => string;
}

export function NewMessagesCard({
  newMessageConversations,
  unreadCount,
  statusLoading,
  doctorStatus,
  onConversationClick,
  formatTime,
}: NewMessagesCardProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50/50 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">New Messages</CardTitle>
              <CardDescription className="text-xs">
                Recent farmer messages
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground border-0">
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
      <CardContent className="p-4">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {newMessageConversations.slice(0, 5).map((conversation) => (
            <div
              key={conversation.id}
              className="flex items-start space-x-3 p-3 border border-slate-200 rounded-xl hover:border-primary/30 hover:bg-slate-50 cursor-pointer transition-all group"
              onClick={() => onConversationClick(conversation.id)}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-primary-foreground font-semibold text-sm">
                  {conversation.farmer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {conversation.farmer.name}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mb-1">
                  {conversation.lastMessage?.text || "No messages yet"}
                </p>
                <p className="text-xs text-slate-400">
                  {formatTime(conversation.updatedAt)}
                </p>
              </div>
            </div>
          ))}
          {newMessageConversations.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No new messages</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
