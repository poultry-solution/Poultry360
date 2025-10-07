"use client";

import React, { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Share2, Image, Pencil, Trash2 } from "lucide-react";

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
}

interface MessageListProps {
  isDoctor: boolean;
  userId: string;
  messages: ChatMessage[];
  typingUsers: any[];
  endRef?: RefObject<HTMLDivElement | null>;
  formatTime: (d: string | Date) => string;
  onEditMessage?: (m: ChatMessage) => void;
  onDeleteMessage?: (m: ChatMessage) => void;
}

export default function MessageList({
  messages,
  typingUsers,
  endRef,
  formatTime,
  onEditMessage,
  onDeleteMessage,
  userId,
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message: any) => {
        const isSelf = message?.sender?.id === userId;
        return (
          <div
            key={message.id}
            className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] sm:max-w-[70%] ${
                isSelf ? "bg-primary text-primary-foreground" : "bg-muted"
              } rounded-lg p-3`}
            >
              {/* Owner actions */}
              {isSelf && (onEditMessage || onDeleteMessage) && (
                <div
                  className={`flex gap-2 justify-end mb-2 ${isSelf ? "text-primary-foreground/80" : "text-foreground/80"}`}
                >
                  {onEditMessage && (
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
              {message?.messageType === "IMAGE" && (
                <div className="mb-2">
                  <div className="bg-gray-200 rounded-lg p-4 text-center">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-gray-600">Image message</p>
                  </div>
                </div>
              )}

              {message?.messageType === "BATCH_SHARE" ||
              (message?.text || "").startsWith("BATCH_SHARE:") ? (
                <div>
                  <div
                    className={`relative overflow-hidden rounded-lg ${isSelf ? "bg-white/10" : "bg-white"} p-4 shadow-md ring-1 ring-inset ${
                      isSelf ? "ring-white/15" : "ring-gray-100"
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
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${isSelf ? "bg-white/20" : "bg-primary/10"}`}>
                          <Share2 className={`h-4 w-4 ${isSelf ? "text-white" : "text-primary"}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold tracking-tight">
                            Batch Data Shared
                          </div>
                          <div
                            className={`text-xs ${isSelf ? "text-primary-foreground/75" : "text-gray-500"}`}
                          >
                            Secure snapshot link is attached
                          </div>
                        </div>
                      </div>
                      <Badge className={`${isSelf ? "bg-black/10 text-white/90" : "bg-emerald-50 text-emerald-700 border border-emerald-200"} shadow-sm`}>
                        Snapshot
                      </Badge>
                    </div>

                    <div className="relative mt-3 flex items-center gap-2">
                      <a
                        href={`/share/batch/${(message?.text || "").replace("BATCH_SHARE:", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isSelf ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                      >
                        View Full Report
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const token = (message?.text || "").replace(
                            "BATCH_SHARE:",
                            ""
                          );
                          const origin =
                            typeof window !== "undefined"
                              ? window.location.origin
                              : "";
                          navigator.clipboard.writeText(
                            `${origin}/share/batch/${token}`
                          );
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isSelf ? "border-white/20 text-primary-foreground hover:bg-white/10" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                      >
                        Copy Link
                      </button>
                    </div>

                    <div
                      className={`relative mt-3 text-[11px] ${isSelf ? "text-primary-foreground/60" : "text-gray-500"}`}
                    >
                      Token:{" "}
                      <span
                        className={`${isSelf ? "text-white" : "text-gray-800"} font-mono`}
                      >
                        {(message?.text || "")
                          .replace("BATCH_SHARE:", "")
                          .slice(0, 6)}
                        •••
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm">{message?.text || ""}</p>
              )}

              <p
                className={`text-xs mt-1 ${isSelf ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
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
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {typingUsers.length} user{typingUsers.length > 1 ? "s" : ""}{" "}
              typing...
            </p>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
