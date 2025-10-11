"use client";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Image as ImageIcon, Paperclip, Send, Share2, X, FileText, Film, Mic, File, Loader2 } from "lucide-react";
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
      case "IMAGE": return <ImageIcon className="h-4 w-4" />;
      case "VIDEO": return <Film className="h-4 w-4" />;
      case "AUDIO": return <Mic className="h-4 w-4" />;
      case "PDF":
      case "DOC": return <FileText className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="border-t p-4">
      {/* Attachment Preview */}
      {attachmentPreview && (
        <div className="mb-3 p-3 bg-muted rounded-lg">
          <div className="flex items-start gap-3">
            {attachmentPreview.type === "IMAGE" ? (
              <img
                src={attachmentPreview.url}
                alt={attachmentPreview.fileName}
                className="w-20 h-20 object-cover rounded"
              />
            ) : (
              <div className="w-20 h-20 bg-background rounded flex items-center justify-center">
                {getFileIcon(attachmentPreview.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachmentPreview.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachmentPreview.fileSize)}
                {attachmentPreview.width && attachmentPreview.height && 
                  ` • ${attachmentPreview.width}x${attachmentPreview.height}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={clearAttachment}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-3 p-3 bg-muted rounded-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Uploading file...</span>
        </div>
      )}

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
            />
            <input
              type="file"
              accept="*/*"
              onChange={handleFileUpload}
              className="hidden"
              id={`${fileInputId}-doc`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={openShareModal}
              disabled={!isConnected || isUploading}
              title="Share Batch"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => document.getElementById(fileInputId)?.click()}
              disabled={!isConnected || isUploading}
              title="Upload Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => document.getElementById(`${fileInputId}-doc`)?.click()}
              disabled={!isConnected || isUploading}
              title="Upload File"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {onVoiceClick && (
          <Button
            onClick={onVoiceClick}
            disabled={!isConnected || isUploading}
            className="bg-secondary hover:bg-primary cursor-pointer"
            title="Send Voice Message"
          >
            <Mic className="h-4 w-4" color="black" />
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


