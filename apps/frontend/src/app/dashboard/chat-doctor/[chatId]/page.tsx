"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  Image,
  Paperclip,
  MoreVertical,
  Share2,
  Search,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  useCurrentConversation,
  useMessageInput,
  useChatConnection,
} from "@/hooks/useChat";
import { toast } from "sonner";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useCreateBatchShare } from "@/fetchers/batchShare/batchShareQueries";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real chat hooks
  const { isConnected, error: connectionError } = useChatConnection();
  const {
    conversation,
    messages,
    isLoading,
    error,
    typingUsers,
    onlineUsers,
    sendMessage,
    handleTyping,
    markAsRead,
  } = useCurrentConversation(chatId);

  const {
    text,
    setText,
    sendMessage: sendMessageHandler,
    handleKeyPress,
    canSend,
  } = useMessageInput(chatId);

  // Share Batch Modal state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [expiresIn, setExpiresIn] = useState<"never" | "1d" | "7d" | "30d">(
    "7d"
  );
  const [batchFilter, setBatchFilter] = useState<
    "ALL" | "ACTIVE" | "COMPLETED"
  >("ALL");
  const [batchSearch, setBatchSearch] = useState("");
  const createShareMutation = useCreateBatchShare();
  const { data: batchesResponse } = useGetAllBatches();
  const allBatches = (batchesResponse?.data || []) as any[];
  const filteredBatches = allBatches
    .filter((b) => (batchFilter === "ALL" ? true : b.status === batchFilter))
    .filter((b) => {
      if (!batchSearch.trim()) return true;
      const q = batchSearch.trim().toLowerCase();
      return (
        (b.batchNumber || "").toLowerCase().includes(q) ||
        (b.farm?.name || "").toLowerCase().includes(q)
      );
    });

  // axiosInstance is configured; no need for manual backend base here

  // Mark messages as read when conversation loads or when new messages arrive
  useEffect(() => {
    if (chatId && isConnected && messages.length > 0) {
      markAsRead();
    }
  }, [chatId, isConnected, messages.length, markAsRead]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      toast.error(`Connection Error: ${connectionError}`);
    }
  }, [connectionError]);

  // Handle conversation errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load conversation");
      console.error("Conversation error:", error);
    }
  }, [error]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement image upload to server
    toast.info("Image upload feature coming soon!");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Slash command to open share dialog
  useEffect(() => {
    const v = (text || "").trim().toLowerCase();
    if (v === "/share") {
      setIsShareOpen(true);
      setText("");
    }
  }, [text, setText]);

  const openShareModal = () => setIsShareOpen(true);

  const submitShare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBatchId) {
      toast.error("Please select a batch to share");
      return;
    }
    try {
      const res = await createShareMutation.mutateAsync({
        batchId: selectedBatchId,
        title: shareTitle || undefined,
        description: shareNote || undefined,
        expiresIn,
        conversationId: chatId,
      });

      console.log("res", res);
      const token = (res as any)?.shareToken;
      if (!token) throw new Error("No share token returned");

      const messageToBeSent = `BATCH_SHARE:${token}`;
      // Send message directly without setting text state
      sendMessage(messageToBeSent);

      toast.success("Batch shared in chat");
      setIsShareOpen(false);
      setSelectedBatchId("");
      setShareTitle("");
      setShareNote("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to share batch");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {error ? "Failed to load conversation" : "Conversation not found"}
          </p>
          <Button onClick={() => router.push("/dashboard/chat-doctor")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/chat-doctor")}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {(() => {
                    const name = conversation?.doctor?.name || "";
                    const trimmed = name.trim();
                    if (!trimmed) return "?";
                    const parts = trimmed.split(/\s+/);
                    const initials = parts
                      .slice(0, 2)
                      .map((p: string) => p[0])
                      .join("")
                      .toUpperCase();
                    return initials || "?";
                  })()}
                </span>
              </div>
              <div>
                <CardTitle className="text-lg">
                  {conversation?.doctor?.name || "Unknown Doctor"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Veterinary Doctor
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className={`${
                  conversation?.doctor?.isOnline
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {conversation?.doctor?.isOnline ? "Online" : "Offline"}
              </Badge>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 rounded-none border-0">
        <CardContent className="p-0 h-full">
          <div className="h-full flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message: any) => {
                const isOwner = message?.sender?.role === "OWNER";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwner ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] ${
                        isOwner
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      } rounded-lg p-3`}
                    >
                      {message?.messageType === "IMAGE" && (
                        <div className="mb-2">
                          <div className="bg-gray-200 rounded-lg p-4 text-center">
                            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm text-gray-600">
                              Image message
                            </p>
                          </div>
                        </div>
                      )}
                      {message?.messageType === "BATCH_SHARE" ||
                      (message?.text || "").startsWith("BATCH_SHARE:") ? (
                        <div>
                          <div
                            className={`relative overflow-hidden rounded-lg ${isOwner ? "bg-white/10" : "bg-white"} p-4 shadow-md ring-1 ring-inset ${isOwner ? "ring-white/15" : "ring-gray-100"}`}
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
                                <div
                                  className={`h-8 w-8 rounded-md flex items-center justify-center ${
                                    isOwner ? "bg-white/20" : "bg-primary/10"
                                  }`}
                                >
                                  <Share2
                                    className={`h-4 w-4 ${
                                      isOwner ? "text-white" : "text-primary"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold tracking-tight">
                                    Batch Data Shared
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      isOwner
                                        ? "text-primary-foreground/75"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    Secure snapshot link is attached
                                  </div>
                                </div>
                              </div>
                              <Badge
                                className={`${
                                  isOwner
                                    ? "bg-black/10 text-white/90"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                                  isOwner
                                    ? "bg-white text-primary hover:bg-white/90"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }`}
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
                                className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                  isOwner
                                    ? "border-white/20 text-primary-foreground hover:bg-white/10"
                                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                Copy Link
                              </button>
                            </div>

                            <div
                              className={`relative mt-3 text-[11px] ${
                                isOwner
                                  ? "text-primary-foreground/60"
                                  : "text-gray-500"
                              }`}
                            >
                              Token:{" "}
                              <span
                                className={`${
                                  isOwner ? "text-white" : "text-gray-800"
                                } font-mono`}
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
                        className={`text-xs mt-1 ${
                          isOwner
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {message?.createdAt
                          ? formatTime(message.createdAt)
                          : ""}
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
                      {typingUsers.length} user
                      {typingUsers.length > 1 ? "s" : ""} typing...
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
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
                      id="image-upload"
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
                      onClick={() =>
                        document.getElementById("image-upload")?.click()
                      }
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
                  onClick={() => sendMessageHandler()}
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
          </div>
        </CardContent>
      </Card>

      {/* Share Batch Modal */}
      <Modal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Share Batch Data"
      >
        <form onSubmit={submitShare}>
          <ModalContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Select Batch</Label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    className={`px-2 py-1 rounded ${batchFilter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => setBatchFilter("ALL")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded ${batchFilter === "ACTIVE" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => setBatchFilter("ACTIVE")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded ${batchFilter === "COMPLETED" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => setBatchFilter("COMPLETED")}
                  >
                    Completed
                  </button>
                </div>
              </div>
              <div className="relative">
                <Input
                  placeholder="Search batches..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="pl-8"
                />
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="max-h-64 overflow-auto border rounded-md">
                {filteredBatches.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No batches found
                  </div>
                ) : (
                  filteredBatches.map((b) => (
                    <label
                      key={b.id}
                      className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer ${selectedBatchId === b.id ? "bg-primary/5" : "hover:bg-muted"}`}
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {b.batchNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.farm?.name} •{" "}
                          {new Date(b.startDate).toLocaleDateString()} •{" "}
                          {b.status}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="batch"
                        checked={selectedBatchId === b.id}
                        onChange={() => setSelectedBatchId(b.id)}
                      />
                    </label>
                  ))
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Title (optional)</Label>
                  <Input
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    placeholder="e.g., Week 5 health check"
                  />
                </div>
                <div>
                  <Label className="text-sm">Expires In</Label>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value as any)}
                  >
                    <option value="never">Never</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-sm">Note (optional)</Label>
                <Input
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="Add context for the doctor"
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsShareOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary"
              disabled={createShareMutation.isPending || !selectedBatchId}
            >
              {createShareMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sharing...
                </>
              ) : (
                "Share"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
