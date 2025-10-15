"use client";

interface DoctorWelcomeBannerProps {
  userName: string | null;
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
  statusLoading: boolean;
}

export function DoctorWelcomeBanner({
  userName,
  doctorStatus,
  statusLoading,
}: DoctorWelcomeBannerProps) {
  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-primary/10">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back, Dr. {userName}
          </h2>
          <p className="text-slate-600 text-lg">
            Ready to make a difference today
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-4 bg-white rounded-xl px-6 py-4 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                doctorStatus?.user?.isOnline
                  ? "bg-green-500 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">
                {statusLoading
                  ? "Loading..."
                  : doctorStatus?.user?.isOnline
                    ? "Online"
                    : "Offline"}
              </p>
              {doctorStatus?.user?.lastSeen &&
                !doctorStatus.user.isOnline && (
                  <p className="text-xs text-slate-500">
                    Last seen:{" "}
                    {new Date(
                      doctorStatus.user.lastSeen
                    ).toLocaleTimeString()}
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
