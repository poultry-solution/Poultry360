import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/common/lib/axios';
import type {
  Conversation,
  ConversationsResponse,
  ConversationWithMessages,
  MessagesResponse,
  CreateConversationData,
  SendMessageData,
  Doctor,
  UnreadCounts,
  SearchMessagesResponse,
  Message
} from '@/common/types/chat';

// ==================== QUERY KEYS ====================
export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...chatKeys.conversations(), id] as const,
  messages: (conversationId: string) => [...chatKeys.conversation(conversationId), 'messages'] as const,
  doctors: () => [...chatKeys.all, 'doctors'] as const,
  unreadCount: () => [...chatKeys.all, 'unreadCount'] as const,
  search: (conversationId: string, query: string) => [...chatKeys.conversation(conversationId), 'search', query] as const,
};

// ==================== CONVERSATION QUERIES ====================

export const useConversations = (params?: {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
}) => {
  return useQuery({
    queryKey: [...chatKeys.conversations(), params],
    queryFn: async (): Promise<ConversationsResponse> => {
      const response = await axiosInstance.get('/conversations', { params });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useConversation = (conversationId: string, params?: {
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...chatKeys.conversation(conversationId), params],
    queryFn: async (): Promise<ConversationWithMessages> => {
      const response = await axiosInstance.get(`/conversations/${conversationId}`, { params });
      return response.data;
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
  });
};

export const useAvailableDoctors = () => {
  return useQuery({
    queryKey: chatKeys.doctors(),
    queryFn: async (): Promise<{ doctors: Doctor[] }> => {
      const response = await axiosInstance.get('/conversations/doctors');
      
      console.log(response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useOnlineDoctors = () => {
  return useQuery({
    queryKey: [...chatKeys.doctors(), 'online'],
    queryFn: async (): Promise<{ doctors: Doctor[]; total: number }> => {
      const response = await axiosInstance.get('/doctors/online');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: chatKeys.unreadCount(),
    queryFn: async (): Promise<UnreadCounts> => {
      const response = await axiosInstance.get('/conversations/unread-count');
      return response.data;
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useSearchMessages = (
  conversationId: string,
  query: string,
  params?: { page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: [...chatKeys.search(conversationId, query), params],
    queryFn: async (): Promise<SearchMessagesResponse> => {
      const response = await axiosInstance.get(`/conversations/${conversationId}/search`, {
        params: { q: query, ...params }
      });
      return response.data;
    },
    enabled: !!conversationId && !!query && query.length > 2,
    staleTime: 60000, // 1 minute
  });
};

// ==================== CONVERSATION MUTATIONS ====================

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConversationData): Promise<{ conversation: Conversation; initialMessage?: Message }> => {
      const response = await axiosInstance.post('/conversations', data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.doctors() });
      
      // If there's an initial message, invalidate the conversation messages
      if (data.initialMessage && data.conversation) {
        queryClient.invalidateQueries({ queryKey: chatKeys.conversation(data.conversation.id) });
      }
    },
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      ...data
    }: {
      conversationId: string;
      status?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
      subject?: string;
    }): Promise<{ conversation: Conversation }> => {
      const response = await axiosInstance.put(`/conversations/${conversationId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(variables.conversationId) });
    },
  });
};

export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageIds
    }: {
      conversationId: string;
      messageIds?: string[];
    }): Promise<{ message: string; readCount: number }> => {
      const response = await axiosInstance.post(`/conversations/${conversationId}/mark-read`, {
        messageIds
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<{ success: boolean; message: string }> => {
      const response = await axiosInstance.delete(`/conversations/${conversationId}`);
      return response.data;
    },
    onSuccess: (data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.removeQueries({ queryKey: chatKeys.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() });
    },
  });
};

// ==================== MESSAGE MUTATIONS ====================

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessageData): Promise<{ messageId: string }> => {
      // This will be handled by Socket.IO, but we can use this for optimistic updates
      return { messageId: `temp-${Date.now()}` };
    },
    onMutate: async (variables) => {
      // Optimistic update
      const queryKey = chatKeys.conversation(variables.conversationId);
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);
      
      // Add optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        text: variables.text,
        messageType: variables.messageType || 'TEXT' as const,
        createdAt: new Date().toISOString(),
        read: false,
        edited: false,
        sender: {
          id: 'current-user', // This should come from auth context
          name: 'You',
          role: 'FARMER' // This should come from auth context
        }
      };

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...(old.messages || []), optimisticMessage]
        };
      });

      return { previousData, queryKey };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate to refetch real data
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
};

// ==================== UTILITY HOOKS ====================

// Combined doctor hook with online status
export const useDoctorsWithStatus = () => {
  const allDoctors = useAvailableDoctors();
  const onlineDoctors = useOnlineDoctors();

  return {
    doctors: allDoctors.data?.doctors || [],
    onlineDoctors: onlineDoctors.data?.doctors || [],
    totalOnline: onlineDoctors.data?.total || 0,
    isLoading: allDoctors.isLoading || onlineDoctors.isLoading,
    error: allDoctors.error || onlineDoctors.error,
    refetch: () => {
      allDoctors.refetch();
      onlineDoctors.refetch();
    }
  };
};

export const useChatData = (conversationId?: string) => {
  const conversations = useConversations();
  const conversation = useConversation(conversationId || '');
  const unreadCount = useUnreadCount();
  const doctors = useAvailableDoctors();

  return {
    conversations: conversations.data,
    conversation: conversation.data,
    unreadCount: unreadCount.data,
    doctors: doctors.data?.doctors,
    isLoading: conversations.isLoading || conversation.isLoading || unreadCount.isLoading || doctors.isLoading,
    error: conversations.error || conversation.error || unreadCount.error || doctors.error,
  };
};
