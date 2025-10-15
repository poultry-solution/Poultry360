"use client";

import React, { RefObject } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Share2, Image as ImageIcon, Pencil, Trash2, FileText, Film, Mic, Download, File } from "lucide-react";

export interface ChatMessageSender {
  id: string;
  name: string;
  role: string;
}

export interface ChatMessage {
  id: string;
  text?: string;
  messageType: string;
  createdAt: string | Date;
  sender?: ChatMessageSender;
  attachmentUrl?: string;
  attachmentKey?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
}

interface MessageListProps {
  messages: ChatMessage[];
  typingUsers: any[];
  endRef?: RefObject<HTMLDivElement | null>;
  formatTime: (d: string | Date) => string;
  onEditMessage?: (m: ChatMessage) => void;
  onDeleteMessage?: (m: ChatMessage) => void;
}

export default function MessageList({ messages, typingUsers, endRef, formatTime, onEditMessage, onDeleteMessage }: MessageListProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "VIDEO": return <Film className="h-5 w-5" />;
      case "AUDIO": return <Mic className="h-5 w-5" />;
      case "PDF":
      case "DOC": return <FileText className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  console.log("messages", messages);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message: any) => {
        const isOwner = message?.sender?.role === "OWNER";
        return (
          <div key={message.id} className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] sm:max-w-[70%] ${
                isOwner ? "bg-primary text-primary-foreground" : "bg-muted"
              } rounded-lg p-3`}
            >
              {/* Actions: Edit only for TEXT, Delete for all */}
              {isOwner && (onEditMessage || onDeleteMessage) && (
                <div className={`flex gap-2 justify-end mb-2 ${isOwner ? "text-primary-foreground/80" : "text-foreground/80"}`}>
                  {onEditMessage && message.messageType === "TEXT" && (
                    <button
                      type="button"
                      aria-label="Edit message"
                      className="text-xs inline-flex items-center gap-1 opacity-80 hover:opacity-100"
                      onClick={() => onEditMessage(message)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                  {onDeleteMessage && (
                    <button
                      type="button"
                      aria-label="Delete message"
                      className="text-xs inline-flex items-center gap-1 opacity-80 hover:opacity-100"
                      onClick={() => onDeleteMessage(message)}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              )}

              {/* IMAGE */}
              {message?.messageType === "IMAGE" && message?.attachmentUrl && (
                <div className="mb-2">
                  <img 
                    src={message.attachmentUrl} 
                    alt={message.fileName || "Image"} 
                    className="rounded-lg max-w-full h-auto max-h-96 object-contain"
                    loading="lazy"
                  />
                  {message.fileName && (
                    <p className={`text-xs mt-2 ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {message.fileName} {message.fileSize && `• ${formatFileSize(message.fileSize)}`}
                    </p>
                  )}
                </div>
              )}

              {/* VIDEO */}
              {message?.messageType === "VIDEO" && message?.attachmentUrl && (
                <div className="mb-2">
                  <video 
                    src={message.attachmentUrl} 
                    controls 
                    className="rounded-lg max-w-full h-auto max-h-96"
                  >
                    Your browser does not support the video tag.
                  </video>
                  {message.fileName && (
                    <p className={`text-xs mt-2 ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {message.fileName} {message.fileSize && `• ${formatFileSize(message.fileSize)}`}
                      {message.durationMs && ` • ${formatDuration(message.durationMs)}`}
                    </p>
                  )}
                </div>
              )}

              {/* AUDIO */}
              {message?.messageType === "AUDIO" && message?.attachmentUrl && (
                <div className="mb-2 p-3 bg-background/10 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Mic className={`h-5 w-5 ${isOwner ? "text-primary-foreground" : "text-foreground"}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isOwner ? "text-primary-foreground" : "text-foreground"}`}>
                        {message.fileName || "Audio"}
                      </p>
                      <p className={`text-xs ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {message.fileSize && formatFileSize(message.fileSize)}
                        {message.durationMs && ` • ${formatDuration(message.durationMs)}`}
                      </p>
                    </div>
                  </div>
                  <audio src={message.attachmentUrl} controls className="w-full" />
                </div>
              )}

              {/* PDF / DOC / OTHER FILES */}
              {(message?.messageType === "PDF" || message?.messageType === "DOC" || message?.messageType === "OTHER") && message?.attachmentUrl && (
                <a 
                  href={message.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-lg ${isOwner ? "bg-background/10 hover:bg-background/20" : "bg-background hover:bg-background/80"} transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${isOwner ? "bg-background/20" : "bg-muted"}`}>
                      {getFileIcon(message.messageType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isOwner ? "text-primary-foreground" : "text-foreground"}`}>
                        {message.fileName || "File"}
                      </p>
                      <p className={`text-xs ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {message.fileSize && formatFileSize(message.fileSize)}
                      </p>
                    </div>
                    <Download className={`h-4 w-4 ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`} />
                  </div>
                </a>
              )}

              {/* BATCH_SHARE */}
              {message?.messageType === "BATCH_SHARE" || (message?.text || "").startsWith("BATCH_SHARE:") ? (
                <div>
                  <div
                    className={`relative overflow-hidden rounded-lg ${isOwner ? "bg-white/10" : "bg-white"} p-4 shadow-md ring-1 ring-inset ${
                      isOwner ? "ring-white/15" : "ring-gray-100"
                    }`}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none opacity-10"
                      style={{
                        background:
                          "radial-gradient(600px circle at 0 0, #22c55e 10%, transparent 40%), radial-gradient(600px circle at 100% 0, #06b6d4 10%, transparent 40%)",
                      }}
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${isOwner ? "bg-white/20" : "bg-primary/10"}`}>
                          <Share2 className={`h-4 w-4 ${isOwner ? "text-white" : "text-primary"}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold tracking-tight">Batch Data Shared</div>
                          <div className={`text-xs ${isOwner ? "text-primary-foreground/75" : "text-gray-500"}`}>
                            Secure snapshot link is attached
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          isOwner ? "bg-black/10 text-white/90" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        } shadow-sm`}
                      >
                        Snapshot
                      </Badge>
                    </div>

                    <div className="relative mt-3 flex items-center gap-2">
                      <a
                        href={`/share/batch/${(message?.text || "").replace("BATCH_SHARE:", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isOwner ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        View Full Report
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const token = (message?.text || "").replace("BATCH_SHARE:", "");
                          const origin = typeof window !== "undefined" ? window.location.origin : "";
                          navigator.clipboard.writeText(`${origin}/share/batch/${token}`);
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          isOwner ? "border-white/20 text-primary-foreground hover:bg-white/10" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Copy Link
                      </button>
                    </div>

                    <div className={`relative mt-3 text-[11px] ${isOwner ? "text-primary-foreground/60" : "text-gray-500"}`}>
                      Token: <span className={`${isOwner ? "text-white" : "text-gray-800"} font-mono`}>
                        {(message?.text || "").replace("BATCH_SHARE:", "").slice(0, 6)}•••
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TEXT (caption for media or standalone text) */}
              {message?.text && !message.text.startsWith("BATCH_SHARE:") && (
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              )}

              <p className={`text-xs mt-1 ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {message?.createdAt ? formatTime(message.createdAt) : ""}
              </p>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {typingUsers.length} user{typingUsers.length > 1 ? "s" : ""} typing...
            </p>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}


