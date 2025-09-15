"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Image, Paperclip, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useCurrentConversation, useMessageInput, useTypingIndicator } from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";

export default function DoctorChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  
  // Real-time chat hooks
  const { 
    conversation, 
    messages, 
    isLoading, 
    error, 
    isConnected,
    sendMessage,
    markAsRead
  } = useCurrentConversation(conversationId);
  
  const { 
    text, 
    setText, 
    sendMessage: handleSend, 
    handleKeyPress, 
    isTyping 
  } = useMessageInput(conversationId);
  
  const { 
    typingUsers, 
    isAnyoneTyping, 
    typingText 
  } = useTypingIndicator(conversationId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when component mounts
  useEffect(() => {
    if (conversationId && isConnected) {
      markAsRead();
    }
  }, [conversationId, isConnected, markAsRead]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement image upload to server
    // For now, just send a text message about the image
    const imageMessage = `[Image: ${file.name}]`;
    sendMessage(imageMessage, 'IMAGE');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading conversation: {error.message}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Conversation not found</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Chat Header */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {(() => {
                    const name = conversation?.farmer?.name || '';
                    const trimmed = name.trim();
                    if (!trimmed) return '?';
                    const parts = trimmed.split(/\s+/);
                    const initials = parts.slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
                    return initials || '?';
                  })()}
                </span>
              </div>
              <div>
                <CardTitle className="text-lg">{conversation?.farmer?.name || 'Unknown Farmer'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {conversation?.subject || 'Veterinary Consultation'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {conversation?.status || 'UNKNOWN'}
              </Badge>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'} • 
              <strong> Messages:</strong> {messages.length} • 
              <strong> Started:</strong> {conversation?.createdAt ? formatTime(conversation.createdAt) : 'Unknown'}
            </p>
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
                const senderRole = message?.sender?.role;
                const isDoctor = senderRole === 'DOCTOR';
                const isOwner = senderRole === 'OWNER';
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] ${
                        isDoctor
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } rounded-lg p-3`}
                    >
                      {message?.messageType === 'IMAGE' && (
                        <div className="mb-2">
                          <div className="text-sm italic">
                            [Image: {message?.text || ''}]
                          </div>
                        </div>
                      )}
                      {message?.messageType === 'TEXT' && (
                        <p className="text-sm">{message?.text || ''}</p>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        <p className={`text-xs ${
                          isDoctor 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {message?.createdAt ? formatTime(message.createdAt) : ''}
                        </p>
                        <p className={`text-xs ${
                          isDoctor 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {isDoctor ? 'You' : message?.sender?.name || 'Owner'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing Indicator */}
              {isAnyoneTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{typingText}</p>
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
                    placeholder="Type your response..."
                    className="pr-20"
                    onKeyPress={handleKeyPress}
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
                      onClick={() => document.getElementById('image-upload')?.click()}
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
                  onClick={() => handleSend()}
                  disabled={!text.trim() || !isConnected}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {!isConnected && (
                <p className="text-xs text-red-500 mt-2">
                  Disconnected from chat server. Please check your connection.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
