"use client";

import { Modal } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { MessageCircle, AlertCircle } from "lucide-react";

interface PendingRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingConversations: Array<{
    id: string;
    farmer: {
      name: string;
    };
    lastMessage?: {
      text: string;
    };
    unreadCount: number;
  }>;
  onAcceptRequest: (conversationId: string) => void;
}

export function PendingRequestsModal({
  isOpen,
  onClose,
  pendingConversations,
  onAcceptRequest,
}: PendingRequestsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pending Consultation Requests"
    >
      <div className="space-y-3">
        {pendingConversations.map((conversation) => (
          <div
            key={conversation.id}
            className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-all"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/20">
                <span className="text-white font-bold text-sm">
                  {conversation.farmer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-900 truncate">
                  {conversation.farmer.name}
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  {conversation.lastMessage?.text
                    ? conversation.lastMessage.text.length > 40
                      ? `${conversation.lastMessage.text.substring(0, 40)}...`
                      : conversation.lastMessage.text
                    : "No messages yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Badge className="bg-orange-100 text-orange-700 border-0">
                {conversation.unreadCount} new
              </Badge>
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-orange-400 hover:shadow-lg hover:shadow-orange-500/30 rounded-lg"
                onClick={() => onAcceptRequest(conversation.id)}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        ))}
        {pendingConversations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No pending requests
            </h3>
            <p className="text-slate-500">All requests have been handled</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
