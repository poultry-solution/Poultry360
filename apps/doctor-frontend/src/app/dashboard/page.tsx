"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChatRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  requestedAt: string;
  status: "pending" | "active" | "completed";
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [showActiveChats, setShowActiveChats] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);

  // Mock data
  const chatRequests: ChatRequest[] = [
    {
      id: "req_001",
      farmerId: "farmer_123",
      farmerName: "Rajesh Patel",
      farmName: "Green Valley Farm",
      reason: "Chickens showing respiratory symptoms, need immediate advice",
      urgency: "high",
      requestedAt: "2024-01-15T10:30:00Z",
      status: "pending",
    },
    {
      id: "req_002",
      farmerId: "farmer_456",
      farmerName: "Suresh Kumar",
      farmName: "Kumar Poultry",
      reason: "Vaccination schedule consultation",
      urgency: "medium",
      requestedAt: "2024-01-15T11:15:00Z",
      status: "pending",
    },
  ];

  const activeChats = [
    {
      id: "chat_001",
      farmerId: "farmer_111",
      farmerName: "Priya Sharma",
      farmName: "Sharma Poultry",
      startedAt: "2024-01-15T09:00:00Z",
      lastMessage: "Thank you doctor, I'll implement your suggestions",
      unreadCount: 0,
    },
    {
      id: "chat_002", 
      farmerId: "farmer_222",
      farmerName: "Vikram Reddy",
      farmName: "Reddy Farms",
      startedAt: "2024-01-15T08:30:00Z",
      lastMessage: "The mortality rate has decreased significantly",
      unreadCount: 2,
    },
    {
      id: "chat_003",
      farmerId: "farmer_333", 
      farmerName: "Anita Gupta",
      farmName: "Gupta Poultry Farm",
      startedAt: "2024-01-15T07:15:00Z",
      lastMessage: "Should I continue the same medication?",
      unreadCount: 1,
    },
  ];

  const todayStats = {
    totalConsultations: 12,
    completedConsultations: 8,
    activeChats: activeChats.length,
    pendingRequests: chatRequests.length,
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAcceptRequest = (requestId: string) => {
    // Navigate to chat page with the request ID
    router.push(`/chat/${requestId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    DR
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Dr. Veterinary</h1>
                  <p className="text-sm text-muted-foreground">Poultry Specialist</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <Button
                variant={isOnline ? "outline" : "default"}
                size="sm"
                onClick={() => setIsOnline(!isOnline)}
                className="bg-primary hover:bg-primary/90"
              >
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.totalConsultations}</div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.completedConsultations}</div>
              <p className="text-xs text-muted-foreground">Consultations done</p>
            </CardContent>
          </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowActiveChats(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.activeChats}</div>
            <p className="text-xs text-muted-foreground">Click to view chats</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowPendingRequests(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Click to view requests</p>
          </CardContent>
        </Card>
        </div>

        {/* Pending Chat Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Pending Consultation Requests</span>
            </CardTitle>
            <CardDescription>
              Farmers waiting for veterinary consultation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chatRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{request.farmerName}</h4>
                        <p className="text-sm text-muted-foreground">{request.farmName}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getUrgencyColor(request.urgency)}>
                          {request.urgency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(request.requestedAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.reason}
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Chats Modal */}
        <Modal 
          isOpen={showActiveChats} 
          onClose={() => setShowActiveChats(false)}
          title="Active Chats"
        >
          <div className="space-y-4">
            {activeChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">
                      {chat.farmerName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{chat.farmerName}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.lastMessage.length > 30 ? `${chat.lastMessage.substring(0, 30)}...` : chat.lastMessage}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {chat.unreadCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      {chat.unreadCount}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                    onClick={() => {
                      setShowActiveChats(false);
                      router.push(`/chat/${chat.id}`);
                    }}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>
            ))}
            {activeChats.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active chats</p>
              </div>
            )}
          </div>
        </Modal>

        {/* Pending Requests Modal */}
        <Modal 
          isOpen={showPendingRequests} 
          onClose={() => setShowPendingRequests(false)}
          title="Pending Consultation Requests"
        >
          <div className="space-y-4">
            {chatRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">
                      {request.farmerName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{request.farmerName}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {request.reason.length > 30 ? `${request.reason.substring(0, 30)}...` : request.reason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge className={`${getUrgencyColor(request.urgency)} text-xs`}>
                    {request.urgency}
                  </Badge>
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                    onClick={() => {
                      setShowPendingRequests(false);
                      handleAcceptRequest(request.id);
                    }}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
            {chatRequests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
