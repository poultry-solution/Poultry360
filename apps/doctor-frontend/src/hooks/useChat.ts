import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useChat as useChatContext } from '@/contexts/ChatContext';
import { 
  useConversations, 
  useConversation, 
  useCreateConversation as useCreateConversationQuery, 
  useUpdateConversation,
  useMarkMessagesAsRead,
  useAvailableDoctors,
  useDoctorStatus,
  useUpdateDoctorStatus,
  useUnreadCount,
  chatKeys
} from '@/services/chatservices/chatQueries';
import { useQueryClient } from '@tanstack/react-query';
import type { 
  Conversation, 
  Message, 
  CreateConversationData,
  Doctor 
} from '@/types/chat';

// ==================== MAIN CHAT HOOK ====================

export const useChat = () => {
  const chatContext = useChatContext();
  const queryClient = useQueryClient();
  
  // Sync context with React Query
  useEffect(() => {
    // Sync conversations from React Query to context
    const conversationsQuery = queryClient.getQueryData(chatKeys.conversations());
    if (conversationsQuery) {
      // This will be handled by the individual hooks
    }
  }, [queryClient]);

  return chatContext;
};

// ==================== CONVERSATION HOOKS ====================

export const useConversationsList = (params?: {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
}) => {
  const { conversations: contextConversations, setCurrentConversation } = useChatContext();
  const query = useConversations(params);
  
  // Sync query data with context
  useEffect(() => {
    if (query.data?.conversations) {
      // Context will be updated by the ChatProvider
    }
  }, [query.data]);

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversation(conversationId);
  }, [setCurrentConversation]);

  return {
    ...query,
    conversations: query.data?.conversations || contextConversations,
    selectConversation,
  };
};

export const useCurrentConversation = (conversationId?: string) => {
  const { 
    currentConversationId, 
    messages: contextMessages, 
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    typingUsers,
    onlineUsers,
    isConnected
  } = useChatContext();
  
  const activeConversationId = conversationId || currentConversationId;
  const query = useConversation(activeConversationId || '');
  
  // Auto-join conversation when conversationId changes
  useEffect(() => {
    if (activeConversationId && isConnected) {
      // Add a small delay to ensure connection is stable
      const timeoutId = setTimeout(() => {
        if (isConnected) {
          joinConversation(activeConversationId);
        }
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
    
    return () => {
      if (activeConversationId && isConnected) {
        leaveConversation();
      }
    };
  }, [activeConversationId, isConnected, joinConversation, leaveConversation]);

  const sendMessageHandler = useCallback((text: string, messageType?: 'TEXT' | 'IMAGE' | 'FILE') => {
    if (activeConversationId) {
      sendMessage(text, messageType);
    }
  }, [activeConversationId, sendMessage]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  const markAsRead = useCallback((messageIds?: string[]) => {
    if (activeConversationId) {
      markMessagesAsRead(messageIds);
    }
  }, [activeConversationId, markMessagesAsRead]);

  // Merge API messages with real-time messages, avoiding duplicates
  const allMessages = useMemo(() => {
    const apiMessages = ((query.data as any)?.messages || []);
    const merged = [...apiMessages];
    
    // Add context messages that aren't already in the API response
    contextMessages.forEach((contextMsg) => {
      const existsInApi = apiMessages.some((apiMsg: any) => apiMsg.id === contextMsg.id);
      if (!existsInApi) {
        merged.push(contextMsg);
      }
    });
    
    // Sort by creation time to maintain proper order
    merged.sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Doctor] Conversation ${activeConversationId}:`, {
        apiMessages: apiMessages.length,
        contextMessages: contextMessages.length,
        totalMerged: merged.length,
        isConnected,
        isLoading: query.isLoading
      });
    }

    return merged;
  }, [query.data, contextMessages, activeConversationId, isConnected, query.isLoading]);
  return {
    conversation: (query.data as any)?.conversation,
    messages: allMessages,
    isLoading: query.isLoading,
    error: query.error,
    isConnected,
    typingUsers: activeConversationId ? (typingUsers[activeConversationId] || []) : [],
    onlineUsers: activeConversationId ? (onlineUsers[activeConversationId] || []) : [],
    sendMessage: sendMessageHandler,
    handleTyping,
    markAsRead,
  };
};

// ==================== MESSAGE HOOKS ====================

export const useMessageInput = (conversationId?: string) => {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, startTyping, stopTyping } = useChatContext();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    
    if (!isTyping && newText.trim()) {
      setIsTyping(true);
      startTyping();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, 2000);
  }, [isTyping, startTyping, stopTyping]);

  const handleSend = useCallback((messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT') => {
    if (!text.trim() || !conversationId) return;
    
    sendMessage(text, messageType);
    setText('');
    setIsTyping(false);
    stopTyping();
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [text, conversationId, sendMessage, stopTyping]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping]);

  return {
    text,
    setText: handleTextChange,
    sendMessage: handleSend,
    handleKeyPress,
    isTyping,
    canSend: text.trim().length > 0,
  };
};

// ==================== CONVERSATION MANAGEMENT HOOKS ====================

export const useCreateConversation = () => {
  const mutation = useCreateConversationQuery();
  const { setCurrentConversation } = useChatContext();

  const createAndJoin = useCallback(async (data: CreateConversationData) => {
    try {
      const result = await mutation.mutateAsync(data);
      if (result.conversation) {
        setCurrentConversation(result.conversation.id);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }, [mutation, setCurrentConversation]);

  return {
    ...mutation,
    createAndJoin,
  };
};

export const useConversationActions = (conversationId: string) => {
  const updateMutation = useUpdateConversation();
  const markReadMutation = useMarkMessagesAsRead();
  const { setCurrentConversation } = useChatContext();

  const updateConversation = useCallback(async (updates: {
    status?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
    subject?: string;
  }) => {
    return updateMutation.mutateAsync({
      conversationId,
      ...updates
    });
  }, [conversationId, updateMutation]);

  const closeConversation = useCallback(async () => {
    return updateConversation({ status: 'CLOSED' });
  }, [updateConversation]);

  const archiveConversation = useCallback(async () => {
    return updateConversation({ status: 'ARCHIVED' });
  }, [updateConversation]);

  const markAsRead = useCallback(async (messageIds?: string[]) => {
    return markReadMutation.mutateAsync({
      conversationId,
      messageIds
    });
  }, [conversationId, markReadMutation]);

  return {
    updateConversation,
    closeConversation,
    archiveConversation,
    markAsRead,
    isLoading: updateMutation.isPending || markReadMutation.isPending,
  };
};

// ==================== DOCTOR HOOKS ====================

export const useDoctors = () => {
  const query = useAvailableDoctors();
  
  const getOnlineDoctors = useCallback(() => {
    return query.data?.doctors.filter(doctor => doctor.isOnline) || [];
  }, [query.data]);

  const getOfflineDoctors = useCallback(() => {
    return query.data?.doctors.filter(doctor => !doctor.isOnline) || [];
  }, [query.data]);

  console.log(query.data?.doctors);
  return {
    ...query,
    doctors: query.data?.doctors || [],
    onlineDoctors: getOnlineDoctors(),
    offlineDoctors: getOfflineDoctors(),
  };
};

// Export doctor status hooks directly
export { useDoctorStatus, useUpdateDoctorStatus } from '@/services/chatservices/chatQueries';

// ==================== UNREAD COUNT HOOK ====================

export const useUnreadCounts = () => {
  const { unreadCounts: contextUnreadCounts } = useChatContext();
  const query = useUnreadCount();

  return {
    ...query,
    unreadCounts: query.data || contextUnreadCounts,
    totalUnread: query.data?.totalUnread || contextUnreadCounts.totalUnread,
    getUnreadForConversation: (conversationId: string) => 
      query.data?.byConversation[conversationId] || contextUnreadCounts.byConversation[conversationId] || 0,
  };
};

// ==================== UTILITY HOOKS ====================

export const useChatConnection = () => {
  const { isConnected, isLoading, error } = useChatContext();
  
  return {
    isConnected,
    isLoading,
    error,
    isDisconnected: !isConnected && !isLoading,
  };
};

export const useTypingIndicator = (conversationId: string) => {
  const { typingUsers, onlineUsers } = useChatContext();
  
  const currentTypingUsers = typingUsers[conversationId] || [];
  const currentOnlineUsers = onlineUsers[conversationId] || [];
  
  return {
    typingUsers: currentTypingUsers,
    onlineUsers: currentOnlineUsers,
    isAnyoneTyping: currentTypingUsers.length > 0,
    typingText: currentTypingUsers.length > 0 
      ? `${currentTypingUsers.length} user${currentTypingUsers.length > 1 ? 's' : ''} typing...`
      : '',
  };
};
