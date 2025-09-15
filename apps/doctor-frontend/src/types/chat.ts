// ==================== CHAT TYPES ====================

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';
export type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface User {
  id: string;
  name: string;
  role: string;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  messageType: MessageType;
  createdAt: string;
  read: boolean;
  edited: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

export interface Conversation {
  id: string;
  farmer: User;
  doctor: User;
  status: ConversationStatus;
  subject?: string;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface CreateConversationData {
  doctorId: string;
  subject?: string;
}

export interface SendMessageData {
  conversationId: string;
  text: string;
  messageType?: MessageType;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
  };
}

export interface UnreadCounts {
  totalUnread: number;
  byConversation: { [conversationId: string]: number };
}

export interface Doctor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  isOnline: boolean;
}

// ==================== SOCKET EVENTS ====================

export interface SocketEvents {
  // Client to Server
  join_conversation: { conversationId: string };
  send_message: SendMessageData;
  typing_start: { conversationId: string };
  typing_stop: { conversationId: string };
  mark_messages_read: { conversationId: string; messageIds?: string[] };
  leave_conversation: { conversationId: string };

  // Server to Client
  joined_conversation: { conversationId: string };
  new_message: Message;
  conversation_history: { messages: Message[]; totalCount: number; hasMore: boolean };
  user_joined: { userId: string; name: string; role: string };
  user_left: { userId: string; name: string; role: string };
  user_typing: { userId: string; userName: string; isTyping: boolean };
  message_sent: { messageId: string };
  left_conversation: { conversationId: string };
  error: { message: string };
}

// ==================== API RESPONSES ====================

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
  };
}

export interface SearchMessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
  };
}