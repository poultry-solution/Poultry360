"use client";

import { Modal } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { MessageCircle } from "lucide-react";

interface ActiveChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversations: Array<{
    id: string;
    farmer: {
      name: string;
    };
    lastMessage?: {
      text: string;
    };
    unreadCount: number;
  }>;
  onOpenChat: (conversationId: string) => void;
}

export function ActiveChatsModal({
  isOpen,
  onClose,
  activeConversations,
  onOpenChat,
}: ActiveChatsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Active Chats">
      <div className="space-y-3">
        {activeConversations.map((conversation) => (
          <div
            key={conversation.id}
            className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary/30 hover:bg-slate-50 transition-all group"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                <span className="text-primary-foreground font-bold text-sm">
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
              {conversation.unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground border-0">
                  {conversation.unreadCount}
                </Badge>
              )}
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 rounded-lg"
                onClick={() => onOpenChat(conversation.id)}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Open
              </Button>
            </div>
          </div>
        ))}
        {activeConversations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No active chats
            </h3>
            <p className="text-slate-500">Start accepting requests to begin chatting</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
