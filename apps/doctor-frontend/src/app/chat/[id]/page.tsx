"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Image, Paperclip, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  text: string;
  sender: 'farmer' | 'doctor';
  timestamp: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

interface ChatData {
  chatId: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  reason: string;
  startTime: string;
  messages: Message[];
  status: 'pending' | 'active' | 'completed';
}

export default function DoctorChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load or create chat data
  useEffect(() => {
    // In a real app, this would fetch from API
    // For now, create mock data based on the chatId
    const mockChatData: ChatData = {
      chatId: chatId,
      farmerId: "farmer_123",
      farmerName: "Rajesh Patel",
      farmName: "Green Valley Farm",
      reason: "Chickens showing respiratory symptoms, need immediate advice",
      startTime: new Date().toISOString(),
      messages: [
        {
          id: 'farmer_1',
          text: "Hello Doctor, I need urgent help. My chickens are showing respiratory symptoms.",
          sender: 'farmer',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          type: 'text'
        }
      ],
      status: 'active'
    };

    setChatData(mockChatData);
    setIsLoading(false);
  }, [chatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData?.messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !chatData) return;

    const doctorMessage: Message = {
      id: `doctor_${Date.now()}`,
      text: newMessage,
      sender: 'doctor',
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    const updatedMessages = [...chatData.messages, doctorMessage];
    const updatedChat = { ...chatData, messages: updatedMessages };
    
    setChatData(updatedChat);
    setNewMessage('');

    // Simulate farmer typing and response (in real app, this would be real-time)
    setIsTyping(true);
    setTimeout(() => {
      const farmerResponse: Message = {
        id: `farmer_${Date.now()}`,
        text: "Thank you doctor! That's very helpful. I'll implement your suggestions right away.",
        sender: 'farmer',
        timestamp: new Date().toISOString(),
        type: 'text'
      };

      const finalMessages = [...updatedMessages, farmerResponse];
      const finalChat = { ...chatData, messages: finalMessages };
      
      setChatData(finalChat);
      setIsTyping(false);
    }, 2000);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatData) return;

    // Create a mock image URL (in real app, upload to server)
    const imageUrl = URL.createObjectURL(file);
    
    const imageMessage: Message = {
      id: `doctor_${Date.now()}`,
      text: `[Image: ${file.name}]`,
      sender: 'doctor',
      timestamp: new Date().toISOString(),
      type: 'image',
      imageUrl
    };

    const updatedMessages = [...chatData.messages, imageMessage];
    const updatedChat = { ...chatData, messages: updatedMessages };
    
    setChatData(updatedChat);
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
        <div className="text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Chat not found</p>
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
                  {chatData.farmerName.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <CardTitle className="text-lg">{chatData.farmerName}</CardTitle>
                <p className="text-sm text-muted-foreground">{chatData.farmName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Consultation Reason */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Consultation Reason:</strong> {chatData.reason}
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
              {chatData.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] ${
                      message.sender === 'doctor'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } rounded-lg p-3`}
                  >
                    {message.type === 'image' && message.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={message.imageUrl}
                          alt="Shared image"
                          className="max-w-full h-auto rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'doctor' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
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
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your response..."
                    className="pr-20"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
