"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { AlertCircle, MessageCircle } from "lucide-react";

interface PendingRequestsSectionProps {
  pendingConversations: Array<{
    id: string;
    farmer: {
      name: string;
    };
    subject?: string;
    lastMessage?: {
      text: string;
    };
    unreadCount: number;
    updatedAt: string;
  }>;
  conversationsLoading: boolean;
  onAcceptRequest: (conversationId: string) => void;
  formatTime: (dateString: string) => string;
}

export function PendingRequestsSection({
  pendingConversations,
  conversationsLoading,
  onAcceptRequest,
  formatTime,
}: PendingRequestsSectionProps) {
  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader className="border-b bg-gradient-to-r from-orange-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Pending Consultation Requests
              </CardTitle>
              <CardDescription className="text-sm">
                Farmers waiting for consultation
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-700 border-0 px-3 py-1">
            {pendingConversations.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500">Loading conversations...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="group p-5 border border-slate-200 rounded-xl hover:border-primary/30 hover:shadow-md transition-all duration-300 bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                      <span className="text-primary-foreground font-bold">
                        {conversation.farmer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900">
                          {conversation.farmer.name}
                        </h4>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {formatTime(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        {conversation.subject || "Consultation Request"}
                      </p>
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {conversation.lastMessage?.text || "No messages yet"}
                      </p>
                      <div className="flex items-center space-x-2 pt-2">
                        <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                          {conversation.unreadCount} new messages
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 rounded-xl mt-2"
                    onClick={() => onAcceptRequest(conversation.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
            {pendingConversations.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No pending requests
                </h3>
                <p className="text-slate-500">
                  All consultation requests have been addressed
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
