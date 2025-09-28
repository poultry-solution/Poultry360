import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '@/types/chat';

// ==================== SOCKET SERVICE ====================

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event listeners
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  // ==================== CONNECTION MANAGEMENT ====================

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8081';
      
      this.socket = io(socketUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('🔌 Socket connected:', this.socket?.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.isConnected = false;
        this.handleDisconnect(reason);
      });

      // Set up all event listeners
      this.setupSocketEventListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  private handleDisconnect(reason: string): void {
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      if (this.socket && !this.isConnected) {
        this.socket.connect();
      }
    }, delay);
  }

  // ==================== EVENT LISTENERS ====================

  private setupEventListeners(): void {
    // Add any global event listeners here
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Handle all socket events
    Object.keys(this.eventListeners).forEach(event => {
      this.socket?.on(event, (data) => {
        this.emitToListeners(event, data);
      });
    });
  }

  private emitToListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ==================== PUBLIC API ====================

  on<K extends keyof SocketEvents>(event: K, listener: (data: SocketEvents[K]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // If socket is already connected, set up the listener
    if (this.socket && this.isConnected) {
      this.socket.on(event as string, listener as any);
    }
  }

  off<K extends keyof SocketEvents>(event: K, listener: (data: SocketEvents[K]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }

    if (this.socket) {
      this.socket.off(event as string, listener as any);
    }
  }

  emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: Socket not connected`);
    }
  }

  // ==================== CHAT SPECIFIC METHODS ====================

  joinConversation(conversationId: string): void {
    this.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string): void {
    this.emit('leave_conversation', { conversationId });
  }

  sendMessage(conversationId: string, text: string, messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'): void {
    this.emit('send_message', { conversationId, text, messageType });
  }

  startTyping(conversationId: string): void {
    this.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: string): void {
    this.emit('typing_stop', { conversationId });
  }

  markMessagesAsRead(conversationId: string, messageIds?: string[]): void {
    this.emit('mark_messages_read', { conversationId, messageIds });
  }

  // ==================== STATUS MANAGEMENT ====================

  updateOnlineStatus(isOnline: boolean): void {
    this.emit('update_online_status', { isOnline });
  }

  // Listen for doctor status changes
  onDoctorStatusChanged(callback: (data: {
    doctorId: string;
    doctorName: string;
    isOnline: boolean;
    lastSeen: string;
  }) => void): void {
    this.on('doctor_status_changed', callback);
  }

  // Listen for global doctor status changes
  onDoctorGlobalStatusChanged(callback: (data: {
    doctorId: string;
    doctorName: string;
    isOnline: boolean;
    lastSeen: string;
  }) => void): void {
    this.on('doctor_global_status_changed', callback);
  }

  // Listen for user status changes in conversations
  onUserStatusChanged(callback: (data: {
    userId: string;
    userName: string;
    userRole: string;
    isOnline: boolean;
    timestamp: string;
  }) => void): void {
    this.on('user_status_changed', callback);
  }

  // Listen for global user status changes
  onGlobalUserStatusChanged(callback: (data: {
    userId: string;
    userName: string;
    userRole: string;
    isOnline: boolean;
    timestamp: string;
  }) => void): void {
    this.on('global_user_status_changed', callback);
  }

  // Remove status event listeners
  offDoctorStatusChanged(callback: (data: { doctorId: string; doctorName: string; isOnline: boolean; lastSeen: string; }) => void): void {
    this.off('doctor_status_changed', callback);
  }

  offDoctorGlobalStatusChanged(callback: (data: { doctorId: string; doctorName: string; isOnline: boolean; lastSeen: string; }) => void): void {
    this.off('doctor_global_status_changed', callback);
  }

  offUserStatusChanged(callback: (data: { userId: string; userName: string; userRole: string; isOnline: boolean; timestamp: string; }) => void): void {
    this.off('user_status_changed', callback);
  }

  offGlobalUserStatusChanged(callback: (data: { userId: string; userName: string; userRole: string; isOnline: boolean; timestamp: string; }) => void): void {
    this.off('global_user_status_changed', callback);
  }

  // ==================== STATUS ====================

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// ==================== SINGLETON INSTANCE ====================

let socketServiceInstance: SocketService | null = null;

export const getSocketService = (): SocketService => {
  if (!socketServiceInstance) {
    socketServiceInstance = new SocketService();
  }
  return socketServiceInstance;
};

export default SocketService;
