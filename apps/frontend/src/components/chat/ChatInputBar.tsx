"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, Paperclip, Send, Share2 } from "lucide-react";
import React from "react";

interface ChatInputBarProps {
  text: string;
  setText: (v: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTyping: (isTyping: boolean) => void;
  isConnected: boolean;
  openShareModal: () => void;
  sendMessageHandler: () => void;
  canSend: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputId?: string;
}

export default function ChatInputBar(props: ChatInputBarProps) {
  const {
    text,
    setText,
    handleKeyPress,
    handleTyping,
    isConnected,
    openShareModal,
    sendMessageHandler,
    canSend,
    handleImageUpload,
    fileInputId = "image-upload",
  } = props;

  return (
    <div className="border-t p-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="pr-20"
            onKeyPress={handleKeyPress}
            onFocus={() => handleTyping(true)}
            onBlur={() => handleTyping(false)}
            disabled={!isConnected}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id={fileInputId}
            />
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={openShareModal}
              disabled={!isConnected}
              title="Share Batch"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => document.getElementById(fileInputId)?.click()}
              disabled={!isConnected}
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              disabled={!isConnected}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={sendMessageHandler}
          disabled={!canSend || !isConnected}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {!isConnected && (
        <p className="text-xs text-red-500 mt-2">
          Disconnected from chat server. Messages may not be delivered.
        </p>
      )}
    </div>
  );
}


