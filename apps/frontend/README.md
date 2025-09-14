# Chat System Integration Guide

This guide explains how to integrate and use the real-time chat system in your Poultry360 frontend application.

## 🚀 Quick Start

### 1. Setup Chat Provider

Wrap your app with the `ChatProvider`:

```tsx
// app/layout.tsx or your main layout
import { ChatProvider } from '@/contexts/ChatContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
```

### 2. Use Chat Hooks

```tsx
import { useChat, useCurrentConversation, useMessageInput } from '@/hooks/useChat';

function ChatComponent() {
  const { isConnected } = useChat();
  const { messages, sendMessage } = useCurrentConversation('conversation-id');
  const { text, setText, sendMessage: sendMessageHandler } = useMessageInput('conversation-id');

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      {/* Your chat UI */}
    </div>
  );
}
```

## 📚 Available Hooks

### Core Hooks

#### `useChat()`
Main chat context hook providing connection status and global chat state.

```tsx
const { isConnected, error, currentConversationId } = useChat();
```

#### `useCurrentConversation(conversationId?)`
Get current conversation data and real-time messages.

```tsx
const { 
  conversation, 
  messages, 
  sendMessage, 
  typingUsers, 
  onlineUsers 
} = useCurrentConversation('conversation-id');
```

#### `useMessageInput(conversationId?)`
Handle message input with typing indicators.

```tsx
const { 
  text, 
  setText, 
  sendMessage, 
  handleKeyPress, 
  canSend 
} = useMessageInput('conversation-id');
```

### Data Hooks

#### `useConversationsList(params?)`
Get list of conversations with pagination.

```tsx
const { 
  conversations, 
  selectConversation, 
  isLoading 
} = useConversationsList({ 
  page: 1, 
  limit: 20, 
  status: 'ACTIVE' 
});
```

#### `useDoctors()`
Get available doctors for starting conversations.

```tsx
const { 
  doctors, 
  onlineDoctors, 
  offlineDoctors 
} = useDoctors();
```

#### `useUnreadCounts()`
Get unread message counts.

```tsx
const { 
  totalUnread, 
  getUnreadForConversation 
} = useUnreadCounts();
```

### Action Hooks

#### `useCreateConversation()`
Create new conversations.

```tsx
const { createAndJoin, isPending } = useCreateConversation();

const handleCreate = async () => {
  await createAndJoin({ doctorId: 'doctor-id', subject: 'Help needed' });
};
```

#### `useConversationActions(conversationId)`
Manage conversation actions.

```tsx
const { 
  closeConversation, 
  archiveConversation, 
  markAsRead 
} = useConversationActions('conversation-id');
```

## 🔧 API Integration

### REST API Endpoints

All chat data is fetched through React Query hooks that call these endpoints:

- `GET /conversations` - List conversations
- `POST /conversations` - Create conversation
- `GET /conversations/:id` - Get conversation with messages
- `PUT /conversations/:id` - Update conversation
- `GET /conversations/doctors` - Get available doctors
- `GET /conversations/unread-count` - Get unread counts
- `POST /conversations/:id/mark-read` - Mark messages as read
- `GET /conversations/:id/search` - Search messages

### Socket.IO Events

Real-time communication uses these Socket.IO events:

**Client → Server:**
- `join_conversation` - Join a conversation room
- `send_message` - Send a message
- `typing_start/stop` - Typing indicators
- `mark_messages_read` - Mark messages as read
- `leave_conversation` - Leave conversation

**Server → Client:**
- `new_message` - New message received
- `conversation_history` - Recent messages
- `user_joined/left` - User status updates
- `user_typing` - Typing indicators
- `message_sent` - Message delivery confirmation

## 🎨 Example Components

### Basic Chat Interface

```tsx
import { useCurrentConversation, useMessageInput } from '@/hooks/useChat';

function ChatInterface({ conversationId }: { conversationId: string }) {
  const { messages, sendMessage } = useCurrentConversation(conversationId);
  const { text, setText, sendMessage: sendMessageHandler, handleKeyPress } = useMessageInput(conversationId);

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.sender.role === 'FARMER' ? 'sent' : 'received'}`}>
            {message.text}
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="input-area">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={sendMessageHandler}>Send</button>
      </div>
    </div>
  );
}
```

### Conversation List

```tsx
import { useConversationsList } from '@/hooks/useChat';

function ConversationList() {
  const { conversations, selectConversation } = useConversationsList();

  return (
    <div className="conversation-list">
      {conversations?.conversations?.map(conv => (
        <div 
          key={conv.id} 
          onClick={() => selectConversation(conv.id)}
          className="conversation-item"
        >
          <div className="doctor-name">{conv.doctor.name}</div>
          <div className="last-message">{conv.lastMessage?.text}</div>
          {conv.unreadCount > 0 && (
            <div className="unread-badge">{conv.unreadCount}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## 🔒 Authentication

The chat system automatically handles authentication using your existing auth tokens. Make sure:

1. User is authenticated before using chat features
2. `accessToken` is available in your auth store
3. Socket.IO connection includes the token in auth

## 📱 Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8081
```

## 🐛 Troubleshooting

### Connection Issues
- Check if backend Socket.IO server is running
- Verify authentication token is valid
- Check network connectivity

### Message Not Sending
- Ensure user is connected to Socket.IO
- Verify conversation ID is correct
- Check if user has permission for the conversation

### Real-time Updates Not Working
- Verify ChatProvider is wrapping your app
- Check if Socket.IO events are being received
- Ensure React Query cache is being invalidated

## 🚀 Advanced Usage

### Custom Message Types
```tsx
// Send different message types
sendMessage('Hello!', 'TEXT');
sendMessage('image-url', 'IMAGE');
sendMessage('file-url', 'FILE');
```

### Typing Indicators
```tsx
const { typingUsers } = useCurrentConversation(conversationId);

// Show typing indicator
{typingUsers.length > 0 && (
  <div>{typingUsers.length} user(s) typing...</div>
)}
```

### Online Status
```tsx
const { onlineUsers } = useCurrentConversation(conversationId);

// Show online status
<div className={`status ${onlineUsers.includes(userId) ? 'online' : 'offline'}`}>
  {onlineUsers.includes(userId) ? 'Online' : 'Offline'}
</div>
```

This chat system provides a complete real-time messaging solution with persistent storage, authentication, and modern React patterns. The hooks make it easy to integrate chat functionality into any component while maintaining clean separation of concerns.
