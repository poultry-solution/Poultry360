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
  Plus,
  User,
  LogOut,
  Edit,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    date: '',
    time: '',
    type: 'Consultation Reminder'
  });
  const [reminders, setReminders] = useState([
    { id: 1, title: 'Follow-up with Rajesh Patel', date: '2025-09-12', time: '10:00 AM', type: 'Consultation Reminder' },
    { id: 2, title: 'Review vaccination schedule', date: '2025-09-13', time: '02:00 PM', type: 'Medical Reminder' }
  ]);

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

  const handleAddReminder = () => {
    if (!reminderForm.title.trim() || !reminderForm.date || !reminderForm.time) return;

    const newReminder = {
      id: Date.now(),
      title: reminderForm.title,
      date: reminderForm.date,
      time: reminderForm.time,
      type: reminderForm.type
    };

    setReminders([...reminders, newReminder]);
    setReminderForm({ title: '', date: '', time: '', type: 'Consultation Reminder' });
    setIsReminderModalOpen(false);
  };

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log("Logging out...");
    router.push("/");
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile logic
    console.log("Edit profile...");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
               P
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Poultry360</h1>

                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border shadow-lg z-50">
                    <DropdownMenuItem 
                      onClick={handleEditProfile}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome Doctor</h2>
           
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Stats Cards - Smaller */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Total Consultations</CardTitle>
              <Calendar className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{todayStats.totalConsultations}</div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors py-2"
            onClick={() => router.push('/ledger')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Ledger</CardTitle>
              <BookOpen className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">₹15,240</div>
              <p className="text-xs text-muted-foreground">Total transactions</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors py-2"
            onClick={() => setShowActiveChats(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Active Chats</CardTitle>
              <MessageCircle className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{todayStats.activeChats}</div>
              <p className="text-xs text-muted-foreground">Click to view chats</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors py-2"
            onClick={() => setShowPendingRequests(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Pending Requests</CardTitle>
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{todayStats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Click to view requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Chat Requests and Reminders */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pending Chat Requests - Takes 2/3 width */}
          <div className="lg:col-span-2">
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
          </div>

          {/* Right Side - New Messages and Reminders */}
          <div className="lg:col-span-1 space-y-6">
            {/* New Messages Card - Top position */}
            <Card className="h-64 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">New Messages</CardTitle>
                    <CardDescription className="text-xs">
                      Recent farmer messages
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    3
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-3">
                  <div className="flex items-start space-x-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-foreground font-bold text-xs">RP</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">Rajesh Patel</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Need urgent help with sick chickens...
                      </p>
                      <p className="text-xs text-muted-foreground">2 min ago</p>
                    </div>
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                  </div>

                  <div className="flex items-start space-x-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-foreground font-bold text-xs">SK</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">Suresh Kumar</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Thank you for the advice doctor...
                      </p>
                      <p className="text-xs text-muted-foreground">5 min ago</p>
                    </div>
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                  </div>

                  <div className="flex items-start space-x-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-foreground font-bold text-xs">AG</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">Anita Gupta</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Can we schedule a follow-up?
                      </p>
                      <p className="text-xs text-muted-foreground">10 min ago</p>
                    </div>
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminders Card - Bottom position */}
            <Card className="h-64 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Reminders</CardTitle>
                    <CardDescription className="text-xs">
                      Upcoming tasks
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setIsReminderModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-start space-x-3 p-2 border rounded-lg hover:bg-muted/50">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.date}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.time}
                        </p>
                      </div>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No reminders</p>
                      <Button 
                        size="sm" 
                        onClick={() => setIsReminderModalOpen(true)}
                        className="mt-2 bg-primary hover:bg-primary/90 text-xs px-2 py-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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

        {/* Add Reminder Modal */}
        <Modal 
          isOpen={isReminderModalOpen} 
          onClose={() => setIsReminderModalOpen(false)}
          title="Add Reminder"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderTitle">Title</Label>
              <Input
                id="reminderTitle"
                value={reminderForm.title}
                onChange={(e) => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter reminder title"
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reminderDate">Date</Label>
                <Input
                  id="reminderDate"
                  type="date"
                  value={reminderForm.date}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reminderTime">Time</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, time: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reminderType">Reminder Type</Label>
              <select
                id="reminderType"
                value={reminderForm.type}
                onChange={(e) => setReminderForm(prev => ({ ...prev, type: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Consultation Reminder">Consultation Reminder</option>
                <option value="Follow-up Reminder">Follow-up Reminder</option>
                <option value="Medical Reminder">Medical Reminder</option>
                <option value="Appointment Reminder">Appointment Reminder</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsReminderModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddReminder} className="bg-primary hover:bg-primary/90">
                Add Reminder
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
