"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Calendar,
  MessageCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface DoctorStatsCardsProps {
  stats: {
    totalConsultations: number;
    activeChats: number;
    pendingRequests: number;
  };
  statusLoading: boolean;
  doctorStatus: {
    success: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      isOnline: boolean;
      lastSeen: string | null;
    };
    stats: {
      activeConversations: number;
      unreadMessages: number;
    };
  } | undefined;
  onActiveChatsClick: () => void;
  onPendingRequestsClick: () => void;
}

export function DoctorStatsCards({
  stats,
  statusLoading,
  doctorStatus,
  onActiveChatsClick,
  onPendingRequestsClick,
}: DoctorStatsCardsProps) {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-white overflow-hidden group cursor-pointer">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Consultations
            </CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-900">
            {statusLoading
              ? "..."
              : doctorStatus?.stats?.activeConversations ||
                stats.totalConsultations}
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center">
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            Active consultations
          </p>
        </CardContent>
      </Card>

      <Card
        className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group cursor-pointer"
        onClick={onActiveChatsClick}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Chats
            </CardTitle>
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-900">
            {stats.activeChats}
          </div>
          <p className="text-sm text-slate-500 mt-1">Click to view all</p>
        </CardContent>
      </Card>

      <Card
        className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden group cursor-pointer"
        onClick={onPendingRequestsClick}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pending Requests
            </CardTitle>
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-900">
            {stats.pendingRequests}
          </div>
          <p className="text-sm text-slate-500 mt-1">Awaiting response</p>
        </CardContent>
      </Card>
    </div>
  );
}
