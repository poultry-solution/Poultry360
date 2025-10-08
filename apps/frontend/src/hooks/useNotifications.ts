import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  chatMessages: boolean;
  batchUpdates: boolean;
  farmAlerts: boolean;
  expenseWarnings: boolean;
  systemNotifications: boolean;
  vaccinationAlerts: boolean;
  reminderAlerts: boolean;
  requestAlerts: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const queryClient = useQueryClient();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<PushSubscription> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push manager
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      setSubscription(sub);
      
      // Send subscription to backend
      await axiosInstance.post('/notifications/subscribe', {
        subscription: sub.toJSON(),
      });

      console.log('Push subscription successful');
      return sub;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }, [isSupported, permission]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<void> => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      
      // Remove subscription from backend
      await axiosInstance.post('/notifications/subscribe', {
        subscription: null,
      });

      console.log('Push subscription removed');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }, [subscription]);

  // Get user notifications
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get unread count
  const {
    data: unreadCountData,
    refetch: refetchUnreadCount,
  } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications/unread-count');
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await axiosInstance.patch(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.patch('/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Update notification settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const response = await axiosInstance.patch('/notifications/settings', {
        notificationSettings: settings,
      });
      return response.data;
    },
  });

  // Send test notification
  const sendTestNotificationMutation = useMutation({
    mutationFn: async (payload: { title?: string; body?: string; type?: string }) => {
      const response = await axiosInstance.post('/notifications/test', payload);
      return response.data;
    },
  });

  // Initialize notifications (request permission and subscribe)
  const initializeNotifications = useCallback(async (): Promise<boolean> => {
    try {
      if (permission === 'default') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          return false;
        }
      }

      if (permission === 'granted' && !subscription) {
        await subscribeToPush();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }, [permission, subscription, requestPermission, subscribeToPush]);

  // Handle notification click from service worker
  useEffect(() => {
    const handleNotificationClick = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('Notification clicked:', event.data.data);
        
        // Handle navigation or other actions based on notification data
        const { url, type } = event.data.data;
        
        if (url && window.location.pathname !== url) {
          window.location.href = url;
        }
        
        // Mark notification as read if it has an ID
        if (event.data.data.notificationId) {
          markAsReadMutation.mutate(event.data.data.notificationId);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleNotificationClick);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleNotificationClick);
    };
  }, [markAsReadMutation]);

  return {
    // State
    permission,
    subscription,
    isSupported,
    isSubscribed: !!subscription,
    
    // Data
    notifications: notificationsData?.data?.notifications || [],
    unreadCount: unreadCountData?.count || 0,
    isLoadingNotifications,
    notificationsError,
    
    // Actions
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    initializeNotifications,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    updateSettings: updateSettingsMutation.mutate,
    sendTestNotification: sendTestNotificationMutation.mutate,
    
    // Refetch functions
    refetchNotifications,
    refetchUnreadCount,
    
    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isUpdatingSettings: updateSettingsMutation.isPending,
    isSendingTest: sendTestNotificationMutation.isPending,
  };
};
