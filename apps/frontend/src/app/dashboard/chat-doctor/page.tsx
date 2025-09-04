"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Phone, Video, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isOnline: boolean;
  avatar: string;
}

export default function ChatDoctorPage() {
  const router = useRouter();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [chatReason, setChatReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const doctors: Doctor[] = [
    {
      id: '1',
      name: 'Dr. Sharma',
      specialty: 'Poultry Specialist',
      isOnline: true,
      avatar: 'DR'
    },
    {
      id: '2',
      name: 'Dr. Patel',
      specialty: 'Disease Expert',
      isOnline: true,
      avatar: 'DP'
    },
    {
      id: '3',
      name: 'Dr. Kumar',
      specialty: 'Nutrition Expert',
      isOnline: false,
      avatar: 'DK'
    },
    {
      id: '4',
      name: 'Dr. Singh',
      specialty: 'General Veterinary',
      isOnline: true,
      avatar: 'DS'
    }
  ];

  const onlineDoctors = doctors.filter(doctor => doctor.isOnline);
  const activeChats = 2; // Mock data
  const monthlyConsultations = 8; // Mock data

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!chatReason.trim()) {
      newErrors.reason = 'Please provide a reason for consultation';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartChat = () => {
    if (!validateForm() || !selectedDoctor) return;

    // Generate a unique chat ID
    const chatId = `chat_${selectedDoctor.id}_${Date.now()}`;
    
    // Store chat initiation data in localStorage
    const chatData = {
      chatId,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorSpecialty: selectedDoctor.specialty,
      reason: chatReason,
      startTime: new Date().toISOString(),
      messages: []
    };
    
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
    
    // Navigate to chat page
    router.push(`/dashboard/chat-doctor/${chatId}`);
  };

  const openChatModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setChatReason('');
    setErrors({});
    setIsChatModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Chat with Doctor</h1>
          <p className="text-muted-foreground">Get veterinary advice and consultation.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
          <MessageCircle className="mr-2 h-4 w-4" />
          New Consultation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Doctors</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{onlineDoctors.length}</div>
            <p className="text-xs text-muted-foreground">Online now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{activeChats}</div>
            <p className="text-xs text-muted-foreground">Ongoing consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{monthlyConsultations}</div>
            <p className="text-xs text-muted-foreground">Consultations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available Doctors */}
        <Card>
          <CardHeader>
            <CardTitle>Available Doctors</CardTitle>
            <CardDescription>Veterinarians ready for consultation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {doctors.map((doctor) => (
                <div 
                  key={doctor.id} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    doctor.isOnline ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      doctor.isOnline ? 'bg-primary' : 'bg-gray-400'
                    }`}>
                      <span className={`font-bold text-sm ${
                        doctor.isOnline ? 'text-primary-foreground' : 'text-white'
                      }`}>
                        {doctor.avatar}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{doctor.name}</p>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          doctor.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-xs text-muted-foreground">
                          {doctor.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className={`bg-primary hover:bg-primary/90 ${
                      !doctor.isOnline ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={!doctor.isOnline}
                    onClick={() => doctor.isOnline && openChatModal(doctor)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Consultations</CardTitle>
            <CardDescription>Your latest veterinary consultations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div>
                  <p className="font-medium">Batch #B-2024-001 Health Check</p>
                  <p className="text-sm text-muted-foreground">Dr. Sharma • 2 hours ago</p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div>
                  <p className="font-medium">Vaccination Schedule</p>
                  <p className="text-sm text-muted-foreground">Dr. Patel • Yesterday</p>
                </div>
                <Badge variant="default" className="bg-blue-100 text-blue-800">Scheduled</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div>
                  <p className="font-medium">Disease Prevention</p>
                  <p className="text-sm text-muted-foreground">Dr. Kumar • 3 days ago</p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Initiation Modal */}
      <Modal 
        isOpen={isChatModalOpen} 
        onClose={() => setIsChatModalOpen(false)}
        title="Start Consultation"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                {selectedDoctor?.avatar}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{selectedDoctor?.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedDoctor?.specialty}</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason for Consultation *</Label>
            <Input
              id="reason"
              value={chatReason}
              onChange={(e) => setChatReason(e.target.value)}
              placeholder="Describe your concern or question..."
              className="mt-1"
            />
            {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Please provide a clear description of your concern. 
              This helps the doctor understand your situation better and provide more accurate advice.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsChatModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartChat} className="bg-primary hover:bg-primary/90">
              <MessageCircle className="mr-2 h-4 w-4" />
              Start Chat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
