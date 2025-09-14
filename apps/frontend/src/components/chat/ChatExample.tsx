'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat, useMessageInput, useConversationsList, useCurrentConversation } from '@/hooks/useChat';
import { useCreateConversation, useDoctors } from '@/services/chatservices/chatQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ==================== CHAT EXAMPLE COMPONENT ====================

export const ChatExample: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCreateConversation, setShowCreateConversation] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  const { isConnected, error } = useChat();
  const { conversations, selectConversation } = useConversationsList();
  const { 
    conversation, 
    messages, 
    sendMessage, 
    handleTyping,
    typingUsers,
    onlineUsers,
    markAsRead 
  } = useCurrentConversation(selectedConversationId || undefined);
  
  const { text, setText, sendMessage: sendMessageHandler, handleKeyPress, canSend } = useMessageInput(selectedConversationId || undefined);
  const { doctors } = useDoctors();
  const createConversationMutation = useCreateConversation();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when conversation is active
  useEffect(() => {
    if (selectedConversationId && messages.length > 0) {
      markAsRead();
    }
  }, [selectedConversationId, messages, markAsRead]);

  const handleCreateConversation = async () => {
    if (!selectedDoctorId) return;
    
    try {
      const result = await createConversationMutation.mutateAsync({
        doctorId: selectedDoctorId
      });
      
      if (result.conversation) {
        setSelectedConversationId(result.conversation.id);
        setShowCreateConversation(false);
        setSelectedDoctorId('');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSendMessage = () => {
    if (canSend) {
      sendMessageHandler();
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600">
            {error ? 'Connection Error' : 'Connecting to chat...'}
          </div>
          {error && (
            <div className="text-sm text-red-500 mt-2">{error}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button 
            onClick={() => setShowCreateConversation(true)}
            className="w-full mt-2"
            size="sm"
          >
            New Conversation
          </Button>
        </div>
        
        <div className="overflow-y-auto">
          {conversations?.conversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                setSelectedConversationId(conv.id);
                selectConversation(conv.id);
              }}
              className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                selectedConversationId === conv.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">
                    {conv.doctor.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {conv.lastMessage?.text || 'No messages yet'}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {conv.lastMessage?.createdAt 
                  ? new Date(conv.lastMessage.createdAt).toLocaleTimeString()
                  : new Date(conv.createdAt).toLocaleTimeString()
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">
                    {conversation?.doctor.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      conversation?.doctor.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm text-gray-500">
                      {conversation?.doctor.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedConversationId(null)}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender.role === 'FARMER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender.role === 'FARMER'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{message.text}</div>
                    <div className={`text-xs mt-1 ${
                      message.sender.role === 'FARMER' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-4 py-2 rounded-lg">
                    <div className="text-sm text-gray-500">
                      {typingUsers.length} user{typingUsers.length > 1 ? 's' : ''} typing...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => handleTyping(true)}
                  onBlur={() => handleTyping(false)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!canSend}
                  size="sm"
                >
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>

      {/* Create Conversation Modal */}
      {showCreateConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <h3 className="text-lg font-semibold mb-4">Start New Conversation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.isOnline && '(Online)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateConversation(false);
                    setSelectedDoctorId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateConversation}
                  disabled={!selectedDoctorId || createConversationMutation.isPending}
                >
                  {createConversationMutation.isPending ? 'Creating...' : 'Start Chat'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
