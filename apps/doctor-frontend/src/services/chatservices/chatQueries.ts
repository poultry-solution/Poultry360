import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type {
  Conversation,
  ConversationsResponse,
  ConversationWithMessages,
  MessagesResponse,
  CreateConversationData,
  SendMessageData,
  Doctor,
  UnreadCounts,
  SearchMessagesResponse
} from '@/types/chat';

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
    enabled: !!params, // Only run query if params are provided
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
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUnreadCount = (enabled: boolean = true) => {
  return useQuery({
    queryKey: chatKeys.unreadCount(),
    queryFn: async (): Promise<UnreadCounts> => {
      const response = await axiosInstance.get('/conversations/unread-count');
      return response.data;
    },
    enabled,
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
    mutationFn: async (data: CreateConversationData): Promise<{ conversation: Conversation }> => {
      const response = await axiosInstance.post('/conversations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.doctors() });
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
          role: 'DOCTOR' // This should come from auth context
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
