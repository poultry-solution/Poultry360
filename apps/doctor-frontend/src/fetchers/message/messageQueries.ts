import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message, SendMessageData } from "@/types/chat";
import axiosInstance from "@/lib/axios";

// ==================== TYPES ====================
type MessagesResponse = {
  success: boolean;
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

type MessageResponse = { success: boolean; message: Message };

// ==================== QUERY KEYS ====================
export const messageKeys = {
  all: ["messages"] as const,
  conversation: (conversationId: string) => [...messageKeys.all, conversationId] as const,
  conversationPage: (conversationId: string, page: number, limit: number) =>
    [...messageKeys.conversation(conversationId), { page, limit }] as const,
  detail: (messageId: string) => [...messageKeys.all, "detail", messageId] as const,
  search: (conversationId: string, query: string, page: number, limit: number) =>
    [...messageKeys.conversation(conversationId), "search", { query, page, limit }] as const,
};

// ==================== QUERY HOOKS ====================

// Get messages for a conversation
export const useGetMessages = (conversationId: string, page = 1, limit = 50) => {
  return useQuery<MessagesResponse>({
    queryKey: messageKeys.conversationPage(conversationId, page, limit),
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/messages/conversation/${conversationId}`,
        { params: { page, limit } }
      );
      return response.data as MessagesResponse;
    },
    enabled: !!conversationId,
  });
};

// Get single message by id
export const useGetMessage = (messageId?: string) => {
  return useQuery<MessageResponse>({
    queryKey: messageId ? messageKeys.detail(messageId) : messageKeys.detail("null"),
    queryFn: async () => {
      const response = await axiosInstance.get(`/messages/${messageId}`);
      return response.data as MessageResponse;
    },
    enabled: !!messageId,
  });
};

// ==================== MUTATION HOOKS ====================

// Send message (text, attachment, or share)
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await axiosInstance.post(`/messages`, data);
      return response.data as MessageResponse;
    },
    onSuccess: (res) => {
      const m = res.message;
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversationPage(m.conversationId, 1, 50),
      });
    },
  });
};

// Edit text message
export const useEditMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { messageId: string; text: string }) => {
      const response = await axiosInstance.put(`/messages/${params.messageId}`, {
        text: params.text,
      });
      return response.data as MessageResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes("messages"),
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.conversationPage(conversationId, 1, 50) });
    },
  });
};

// Delete message (soft delete)
export const useDeleteMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await axiosInstance.delete(`/messages/${messageId}`);
      return response.data as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.conversationPage(conversationId, 1, 50) });
    },
  });
};

// Mark messages as read
export const useMarkMessagesRead = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageIds?: string[]) => {
      const response = await axiosInstance.post(`/messages/conversation/${conversationId}/read`, {
        messageIds,
      });
      return response.data as { success: boolean; readCount: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.conversationPage(conversationId, 1, 50) });
    },
  });
};

// Search messages in a conversation
export const useSearchMessages = (
  conversationId: string,
  query: string,
  page = 1,
  limit = 20
) => {
  return useQuery({
    queryKey: messageKeys.search(conversationId, query, page, limit),
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/messages/conversation/${conversationId}/search`,
        { params: { query, page, limit } }
      );
      return response.data as { success: boolean; messages: Message[]; query: string };
    },
    enabled: !!conversationId && !!query?.trim(),
  });
};

