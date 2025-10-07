"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Image as ImageIcon,
  Paperclip,
  Send,
  Share2,
  X,
  FileText,
  Film,
  Mic,
  File,
  Loader2,
  Speaker,
} from "lucide-react";
import React from "react";

interface AttachmentPreview {
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "DOC" | "OTHER";
  width?: number;
  height?: number;
  durationMs?: number;
}

interface ChatInputBarProps {
  isDoctor: boolean;
  text: string;
  setText: (v: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTyping: (isTyping: boolean) => void;
  isConnected: boolean;
  openShareModal: () => void;
  sendMessageHandler: () => void;
  canSend: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachmentPreview?: AttachmentPreview | null;
  clearAttachment?: () => void;
  isUploading?: boolean;
  fileInputId?: string;
  onVoiceClick?: () => void;
}

export default function ChatInputBar(props: ChatInputBarProps) {
  const {
    isDoctor,
    text,
    setText,
    handleKeyPress,
    handleTyping,
    isConnected,
    openShareModal,
    sendMessageHandler,
    canSend,
    handleImageUpload,
    handleFileUpload,
    attachmentPreview,
    clearAttachment,
    isUploading = false,
    fileInputId = "image-upload",
    onVoiceClick,
  } = props;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <ImageIcon className="h-5 w-5" />;
      case "VIDEO":
        return <Film className="h-5 w-5" />;
      case "AUDIO":
        return <Mic className="h-5 w-5" />;
      case "PDF":
      case "DOC":
        return <FileText className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  return (
    <div className="border-t p-4 space-y-2">
      {/* Attachment Preview */}
      {attachmentPreview && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          {attachmentPreview.type === "IMAGE" ? (
            <img
              src={attachmentPreview.url}
              alt={attachmentPreview.fileName}
              className="h-16 w-16 object-cover rounded"
            />
          ) : attachmentPreview.type === "VIDEO" ? (
            <video
              src={attachmentPreview.url}
              className="h-16 w-16 object-cover rounded"
            />
          ) : (
            <div className="h-16 w-16 bg-secondary rounded flex items-center justify-center">
              {getFileIcon(attachmentPreview.type)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {attachmentPreview.fileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachmentPreview.fileSize)}
            </p>
          </div>
          {clearAttachment && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={clearAttachment}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}

      {/* Input Area */}
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
            disabled={!isConnected || isUploading}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id={fileInputId}
              disabled={isUploading}
            />
            <input
              type="file"
              accept="*/*"
              onChange={handleFileUpload}
              className="hidden"
              id={`${fileInputId}-doc`}
              disabled={isUploading}
            />
            {!isDoctor && (
              <Button
                onClick={openShareModal}
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={!isConnected || isUploading}
                title="Share Batch"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={() =>
                document.getElementById(fileInputId)?.click()
              }
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={!isConnected || isUploading}
              title="Upload Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            {handleFileUpload && (
              <Button
                onClick={() =>
                  document.getElementById(`${fileInputId}-doc`)?.click()
                }
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={!isConnected || isUploading}
                title="Upload File"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {onVoiceClick && (
          <Button
            onClick={onVoiceClick}
            disabled={!isConnected || isUploading}
            className="bg-primary hover:bg-primary/90"
            title="Send Voice Message"
          >
            <Speaker className="h-4 w-4"  />
          </Button>
        )}
        <Button
          onClick={sendMessageHandler}
          disabled={!canSend || !isConnected || isUploading}
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
