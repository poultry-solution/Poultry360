"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Menu, Settings, LogOut, Bell, BellRing, CheckCheck, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { useAuth } from "@/common/store/store";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  useGetNotifications,
  useGetUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NOTIFICATION_PAGE_SIZE,
  type NotificationItem,
} from "@/fetchers/notifications/notificationQueries";
import {
  isPushSupported,
  subscribeToPush,
  getNotificationPermission,
} from "@/common/lib/pushNotifications";

interface TopbarProps {
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN" | "DEALER" | "COMPANY";
  isCollapsed?: boolean;
  onToggle?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Topbar({ role, isCollapsed = false, onToggle }: TopbarProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [notifOpen, setNotifOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(NOTIFICATION_PAGE_SIZE);

  const { data: unreadData } = useGetUnreadCount();
  const unreadCount = unreadData?.data?.count ?? 0;

  const { data: notifData, isLoading: notifLoading } = useGetNotifications({ limit: displayLimit });
  const notifications = notifData?.data ?? [];
  const totalNotifications = notifData?.total ?? 0;
  const hasMore = totalNotifications > displayLimit;

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const getRoleSettings = () => {
    if (role === "DOCTOR") return { settingsPath: "/doctor/dashboard/settings", homePath: "/doctor/dashboard" };
    if (role === "SUPER_ADMIN") return { settingsPath: "/admin/dashboard/settings", homePath: "/admin/dashboard" };
    if (role === "DEALER") return { settingsPath: "/dealer/dashboard/settings", homePath: "/dealer/dashboard/home" };
    if (role === "COMPANY") return { settingsPath: "/company/dashboard/settings", homePath: "/company/dashboard/home" };
    return { settingsPath: "/farmer/dashboard/settings", homePath: "/farmer/dashboard/home" };
  };

  const roleSettings = getRoleSettings();

  const handleSignOutClick = () => {
    logout();
    router.push("/auth/login");
  };

  const handleNotifClick = (notif: NotificationItem) => {
    if (notif.status === "UNREAD") {
      markReadMutation.mutate(notif.id);
    }
    const url = (notif.data as any)?.url;
    if (url) router.push(url);
    setNotifOpen(false);
  };

  const handleEnablePush = async () => {
    await subscribeToPush();
  };

  const showEnablePush =
    isAuthenticated &&
    isPushSupported() &&
    getNotificationPermission() === "default";

  return (
    <div className="flex h-14 items-center justify-between border-b bg-background px-4 md:h-16 md:px-6">
      {/* Left Side */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Link href={roleSettings.homePath} className="md:hidden flex-shrink-0">
        
        </Link>
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 hidden md:flex"
            title={t("topbar.expandSidebar")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 relative"
            onClick={() => setNotifOpen((o) => !o)}
          >
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-foreground" />
            ) : (
              <Bell className="h-5 w-5 text-foreground" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>

          {notifOpen && (
            <>
              {/* Blurred backdrop - click to close */}
              <div
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                aria-hidden
                onClick={() => setNotifOpen(false)}
              />
              {/* Centered modal */}
              <div
                className="fixed left-1/2 top-1/2 z-[9999] flex w-[calc(100vw-2rem)] max-w-[20rem] max-h-[min(28rem,80vh)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white shadow-2xl"
                role="dialog"
                aria-label="Notifications"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header: title, Mark all read, Close X */}
                <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                  <span className="font-semibold text-sm">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mark all read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="cursor-pointer rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setNotifOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Enable push banner */}
                {showEnablePush && (
                  <div className="shrink-0 border-b bg-primary/5 px-4 py-2">
                    <button
                      className="cursor-pointer text-xs text-primary hover:underline"
                      onClick={handleEnablePush}
                    >
                      Enable push notifications
                    </button>
                  </div>
                )}

                {/* Notifications list + Load more */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {notifLoading ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      No notifications yet
                    </div>
                  ) : (
                    <>
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={`w-full cursor-pointer text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                            n.status === "UNREAD" ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleNotifClick(n)}
                        >
                          <div className="flex items-start gap-2">
                            {n.status === "UNREAD" && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                      {hasMore && (
                        <div className="sticky bottom-0 border-t bg-white p-2">
                          <button
                            type="button"
                            className="w-full cursor-pointer rounded-md border border-primary/30 bg-primary/5 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                            onClick={() => setDisplayLimit((prev) => prev + NOTIFICATION_PAGE_SIZE)}
                          >
                            Load more
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Section */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200"
            >
              <User className="h-5 w-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white border shadow-lg"
          >
            <DropdownMenuLabel>{t("topbar.myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0 cursor-pointer">
              <Link
                href={roleSettings.settingsPath}
                className="flex items-center w-full px-2 py-1.5 cursor-pointer outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("topbar.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOutClick}
              className="text-red-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("topbar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
