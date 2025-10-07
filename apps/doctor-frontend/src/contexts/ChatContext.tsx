"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocketService } from "@/services/chatservices/socketService";
import { chatKeys } from "@/services/chatservices/chatQueries";
import { useAuthStore } from "../store/authStore";

import type {
  Message,
  Conversation,
  SocketEvents,
  UnreadCounts,
} from "../types/chat";

// ==================== CHAT CONTEXT TYPES ====================

interface ChatContextType {
  // Connection
  isConnected: boolean;
  currentConversationId: string | null;

  // Real-time data
  messages: Message[];
  conversations: Conversation[];
  unreadCounts: UnreadCounts;
  typingUsers: { [conversationId: string]: string[] };
  onlineUsers: { [conversationId: string]: string[] };

  // Actions
  joinConversation: (conversationId: string) => void;
  leaveConversation: () => void;
  sendMessage: (text: string, messageType?: "TEXT" | "IMAGE" | "FILE") => void;
  startTyping: () => void;
  stopTyping: () => void;
  markMessagesAsRead: (messageIds?: string[]) => void;

  // State management
  setCurrentConversation: (conversationId: string | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

// ==================== CHAT CONTEXT ====================

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ==================== CHAT PROVIDER ====================

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // ==================== STATE ====================
  const [isConnected, setIsConnected] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    totalUnread: 0,
    byConversation: {},
  });
  const [typingUsers, setTypingUsers] = useState<{
    [conversationId: string]: string[];
  }>({});
  const [onlineUsers, setOnlineUsers] = useState<{
    [conversationId: string]: string[];
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== REFS ====================
  const socketService = useRef(getSocketService());
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuthStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== SOCKET EVENT HANDLERS ====================

  const handleNewMessage = useCallback(
    (socketMessage: any) => {
      // Always log message reception for debugging
      console.log("📨 [Farmer] handleNewMessage triggered:", {
        messageId: socketMessage.id,
        conversationId: socketMessage.conversationId,
        currentConversationId,
        senderRole: socketMessage.senderRole,
        senderId: socketMessage.senderId,
        senderName: socketMessage.senderName,
        text: socketMessage.text?.substring(0, 50) + "...",
        timestamp: new Date().toISOString(),
      });

      // Transform socket message to Message format
      const message: Message = {
        id: socketMessage.id,
        conversationId: socketMessage.conversationId,
        text: socketMessage.text,
        messageType: socketMessage.messageType,
        createdAt: socketMessage.createdAt,
        read: false,
        edited: false,
        sender: {
          id: socketMessage.senderId,
          name: socketMessage.senderName,
          role: socketMessage.senderRole,
        },
      };

      setMessages((prev) => {
        // Check if this is a real message replacing an optimistic one
        const existingOptimisticIndex = prev.findIndex(
          (m) =>
            m.id.startsWith("temp-") &&
            m.text === message.text &&
            m.conversationId === message.conversationId
        );

        if (existingOptimisticIndex !== -1) {
          console.log("🔄 [Farmer] Replacing optimistic message with real:", {
            optimisticId: prev[existingOptimisticIndex].id,
            realId: message.id,
            text: message.text?.substring(0, 30) + "...",
          });
          const newMessages = [...prev];
          newMessages[existingOptimisticIndex] = message;
          return newMessages;
        }

        // Avoid duplicates for real messages
        if (prev.some((m) => m.id === message.id)) {
          console.log("⚠️ [Farmer] Duplicate message rejected:", message.id);
          return prev;
        }

        // Only add messages that belong to the current conversation
        if (message.conversationId !== currentConversationId) {
          console.log("❌ [Farmer] Message not for current conversation:", {
            messageConversationId: message.conversationId,
            currentConversationId,
            messageId: message.id,
          });
          return prev;
        }

        console.log("✅ [Farmer] Adding NEW message to state:", {
          messageId: message.id,
          senderRole: message.sender.role,
          totalAfter: prev.length + 1,
        });
        return [...prev, message];
      });

      // Update conversations list with last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                lastMessage: {
                  id: message.id,
                  text: message.text || "",
                  senderId: message.sender.id,
                  senderName: message.sender.name,
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
                unreadCount:
                  conv.id === currentConversationId ? 0 : conv.unreadCount + 1,
              }
            : conv
        )
      );

      // Update unread counts
      if (message.conversationId !== currentConversationId) {
        setUnreadCounts((prev) => ({
          totalUnread: prev.totalUnread + 1,
          byConversation: {
            ...prev.byConversation,
            [message.conversationId]:
              (prev.byConversation[message.conversationId] || 0) + 1,
          },
        }));
      }

      // Invalidate React Query cache
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversation(message.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    [currentConversationId, queryClient]
  );

  const handleUserJoined = useCallback(
    (data: SocketEvents["user_joined"]) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [currentConversationId || ""]: [
          ...(prev[currentConversationId || ""] || []).filter(
            (id) => id !== data.userId
          ),
          data.userId,
        ],
      }));
    },
    [currentConversationId]
  );

  const handleUserLeft = useCallback(
    (data: SocketEvents["user_left"]) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [currentConversationId || ""]: (
          prev[currentConversationId || ""] || []
        ).filter((id) => id !== data.userId),
      }));
    },
    [currentConversationId]
  );

  const handleUserTyping = useCallback(
    (data: SocketEvents["user_typing"]) => {
      if (!currentConversationId) return;

      setTypingUsers((prev) => {
        const currentTyping = prev[currentConversationId] || [];

        if (data.isTyping) {
          return {
            ...prev,
            [currentConversationId]: [
              ...currentTyping.filter((id) => id !== data.userId),
              data.userId,
            ],
          };
        } else {
          return {
            ...prev,
            [currentConversationId]: currentTyping.filter(
              (id) => id !== data.userId
            ),
          };
        }
      });
    },
    [currentConversationId]
  );

  const handleConversationHistory = useCallback(
    (data: SocketEvents["conversation_history"]) => {
      setMessages(data.messages);
    },
    []
  );

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
      );
    },
    []
  );

  const removeMessage = useCallback((messageId: string) => {
    console.log("removeMessage - marking as deleted", messageId);
    setMessages((prev) => 
      prev.map((msg) => msg.id === messageId ? { ...msg, isDeleted: true } : msg)
    );
  }, []);

  // Handle message updated (edit)
  const handleMessageUpdated = useCallback(
    (data: { success: boolean; message: Message }) => {
      const m = data.message as any;
      if (!m?.conversationId) return;
      if (m.conversationId !== currentConversationId) return;
      updateMessage(m.id, m as any);
    },
    [currentConversationId, updateMessage]
  );

  // Handle message deleted
  const handleMessageDeleted = useCallback(
    (data: { success: boolean; messageId: string; conversationId: string }) => {
      if (!data?.conversationId || !data?.messageId) return;
      if (data.conversationId !== currentConversationId) return;
      removeMessage(data.messageId as string);
    },
    [currentConversationId, removeMessage]
  );

  const handleError = useCallback((data: SocketEvents["error"]) => {
    setError(data.message);
    console.error("Chat error:", data.message);
  }, []);

  const handleMessageSent = useCallback(
    (data: SocketEvents["message_sent"]) => {
      // Message was successfully sent to server
      console.log("Message sent successfully:", data.messageId);
    },
    []
  );

  const handleMessagesRead = useCallback(
    (data: { conversationId: string; userId: string; readCount: number }) => {
      console.log("✅ [Farmer] Messages read event:", data);

      // Update unread counts
      setUnreadCounts((prev) => ({
        totalUnread: Math.max(0, prev.totalUnread - data.readCount),
        byConversation: {
          ...prev.byConversation,
          [data.conversationId]: Math.max(
            0,
            (prev.byConversation[data.conversationId] || 0) - data.readCount
          ),
        },
      }));

      // Update conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? {
                ...conv,
                unreadCount: Math.max(0, conv.unreadCount - data.readCount),
              }
            : conv
        )
      );

      // Invalidate queries to refresh
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversation(data.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() });
    },
    [queryClient]
  );

  // ==================== SOCKET SETUP ====================

  useEffect(() => {
    if (!accessToken || !user) return;

    const connectSocket = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("🔌 [Farmer] Attempting socket connection...", {
          userId: user?.id,
          userName: user?.name,
          userRole: user?.role,
        });

        await socketService.current.connect(accessToken);

        console.log("✅ [Farmer] Socket connected successfully:", {
          socketId: socketService.current.getSocketId(),
        });

        // Debounce connection state to prevent rapid changes
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        connectionTimeoutRef.current = setTimeout(() => {
          setIsConnected(true);
          console.log("✅ [Farmer] Connection state set to true");
        }, 100);

        // Set up event listeners
        console.log("📡 [Farmer] Setting up event listeners...");
        socketService.current.on("new_message", handleNewMessage);
        socketService.current.on("messages_read", handleMessagesRead);
        socketService.current.on("user_joined", handleUserJoined);
        socketService.current.on("user_left", handleUserLeft);
        socketService.current.on("user_typing", handleUserTyping);
        socketService.current.on(
          "conversation_history",
          handleConversationHistory
        );
        socketService.current.on("message_sent", handleMessageSent);
        socketService.current.on("error", handleError);
      } catch (error) {
        console.error("Failed to connect to chat:", error);
        setError("Failed to connect to chat");
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    connectSocket();

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      // Unregister edit/delete handlers
      socketService.current.offMessageUpdated(handleMessageUpdated as any);
      socketService.current.offMessageDeleted(handleMessageDeleted as any);
      socketService.current.disconnect();
      setIsConnected(false);
    };
  }, [
    accessToken,
    user,
    handleNewMessage,
    handleMessagesRead,
    handleUserJoined,
    handleUserLeft,
    handleUserTyping,
    handleConversationHistory,
    handleMessageUpdated,
    handleMessageDeleted,
    handleMessageSent,
    handleError,
  ]);

  // Register edit/delete listeners when connected
  useEffect(() => {
    if (!isConnected) return;
    socketService.current.onMessageUpdated(handleMessageUpdated as any);
    socketService.current.onMessageDeleted(handleMessageDeleted as any);
    return () => {
      socketService.current.offMessageUpdated(handleMessageUpdated as any);
      socketService.current.offMessageDeleted(handleMessageDeleted as any);
    };
  }, [isConnected, handleMessageUpdated, handleMessageDeleted]);

  // ==================== ACTIONS ====================

  const joinConversation = useCallback(
    (conversationId: string) => {
      console.log("🔵 [Farmer] joinConversation called:", {
        conversationId,
        isConnected,
        socketId: socketService.current.getSocketId(),
        userId: user?.id,
        userName: user?.name,
      });

      if (!isConnected) {
        console.warn("⚠️ [Farmer] Cannot join - socket not connected");
        return;
      }

      // Clear old messages when switching conversations
      setMessages([]);
      setCurrentConversationId(conversationId);
      socketService.current.joinConversation(conversationId);

      console.log("✅ [Farmer] Join conversation emitted:", conversationId);
    },
    [isConnected, user]
  );

  const leaveConversation = useCallback(() => {
    if (currentConversationId && isConnected) {
      socketService.current.leaveConversation(currentConversationId);
    }
    setCurrentConversationId(null);
    setMessages([]);
    setTypingUsers((prev) => ({ ...prev, [currentConversationId || ""]: [] }));
  }, [currentConversationId, isConnected]);

  const sendMessage = useCallback(
    (text: string, messageType: "TEXT" | "IMAGE" | "FILE" = "TEXT") => {
      console.log("📤 [Farmer] sendMessage called:", {
        conversationId: currentConversationId,
        isConnected,
        textLength: text.trim().length,
        messageType,
        userId: user?.id,
        socketId: socketService.current.getSocketId(),
      });

      if (!currentConversationId || !isConnected || !text.trim()) {
        console.warn("⚠️ [Farmer] Cannot send message:", {
          hasConversationId: !!currentConversationId,
          isConnected,
          hasText: !!text.trim(),
        });
        return;
      }

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}-${Math.random()}`,
        conversationId: currentConversationId,
        text: text.trim(),
        messageType,
        createdAt: new Date().toISOString(),
        read: false,
        edited: false,
        sender: {
          id: user?.id || "",
          name: user?.name || "",
          role: user?.role || "OWNER",
        },
      };

      console.log("💬 [Farmer] Created optimistic message:", {
        id: optimisticMessage.id,
        conversationId: optimisticMessage.conversationId,
        text: optimisticMessage.text?.substring(0, 30) + "...",
      });

      // Add optimistic message to local state immediately
      setMessages((prev) => {
        console.log(
          "📝 [Farmer] Adding optimistic message to state. Current messages:",
          prev.length
        );
        return [...prev, optimisticMessage];
      });

      // Send message via socket
      console.log("🚀 [Farmer] Emitting send_message event to socket");
      socketService.current.sendMessage(
        currentConversationId,
        text.trim(),
        messageType
      );

      // Set timeout to remove optimistic message if no confirmation received
      setTimeout(() => {
        setMessages((prev) => {
          const messageIndex = prev.findIndex(
            (m) => m.id === optimisticMessage.id
          );
          if (messageIndex !== -1) {
            console.warn(
              "⏰ [Farmer] Message timeout - marking as failed:",
              optimisticMessage.id
            );
            const newMessages = [...prev];
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              text: `${newMessages[messageIndex].text || ""} (Failed to send)`,
            };
            return newMessages;
          } else {
            console.log(
              "✅ [Farmer] Message confirmed (optimistic removed):",
              optimisticMessage.id
            );
          }
          return prev;
        });
      }, 10000); // 10 second timeout
    },
    [currentConversationId, isConnected, user]
  );

  const startTyping = useCallback(() => {
    if (!currentConversationId || !isConnected) return;

    socketService.current.startTyping(currentConversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentConversationId, isConnected]);

  const stopTyping = useCallback(() => {
    if (!currentConversationId || !isConnected) return;

    socketService.current.stopTyping(currentConversationId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentConversationId, isConnected]);

  const markMessagesAsRead = useCallback(
    (messageIds?: string[]) => {
      if (!currentConversationId || !isConnected) return;

      socketService.current.markMessagesAsRead(
        currentConversationId,
        messageIds
      );

      // Update local state
      setUnreadCounts((prev) => ({
        totalUnread: Math.max(
          0,
          prev.totalUnread - (prev.byConversation[currentConversationId] || 0)
        ),
        byConversation: {
          ...prev.byConversation,
          [currentConversationId]: 0,
        },
      }));

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    },
    [currentConversationId, isConnected]
  );

  const setCurrentConversation = useCallback(
    (conversationId: string | null) => {
      if (conversationId === currentConversationId) return;

      if (currentConversationId) {
        leaveConversation();
      }

      if (conversationId) {
        joinConversation(conversationId);
      }
    },
    [currentConversationId, joinConversation, leaveConversation]
  );

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // ==================== CONTEXT VALUE ====================

  const contextValue: ChatContextType = {
    // Connection
    isConnected,
    currentConversationId,

    // Real-time data
    messages,
    conversations,
    unreadCounts,
    typingUsers,
    onlineUsers,

    // Actions
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,

    // State management
    setCurrentConversation,
    addMessage,
    updateMessage,
    removeMessage,

    // Loading states
    isLoading,
    error,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

// ==================== HOOK ====================

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
