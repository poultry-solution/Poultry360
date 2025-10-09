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

  // Check if push notifications are supported and check existing subscription
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check for existing subscription
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            console.log('Found existing push subscription, verifying with backend...');
            
            // Verify the subscription is still valid with the backend
            try {
              const response = await axiosInstance.post('/notifications/subscribe', {
                subscription: existingSubscription.toJSON(),
              });
              
              if (response.data.success) {
                console.log('Existing subscription verified and updated in backend');
                setSubscription(existingSubscription);
              } else {
                console.log('Existing subscription not valid, clearing it');
                await clearSubscription();
              }
            } catch (error) {
              console.error('Failed to verify existing subscription:', error);
              console.log('Clearing invalid subscription');
              await clearSubscription();
            }
          }
        } catch (error) {
          console.error('Error checking existing subscription:', error);
        }
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
      console.log('Permission requested, result:', result);
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
      console.log('Starting push subscription process...');
      
      // Register service worker
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready');
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed, using existing subscription');
        setSubscription(existingSubscription);
        return existingSubscription;
      }
      
      // Subscribe to push manager
      console.log('Creating new push subscription...');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      console.log('Push subscription created, sending to backend...');
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

  // Clear subscription (for invalid subscriptions)
  const clearSubscription = useCallback(async (): Promise<void> => {
    try {
      // Clear from browser
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }
      
      setSubscription(null);
      
      // Clear from backend
      await axiosInstance.post('/notifications/subscribe', {
        subscription: null,
      });
      
      console.log('Cleared invalid subscription');
    } catch (error) {
      console.error('Failed to clear subscription:', error);
      // Still clear the local state even if backend call fails
      setSubscription(null);
    }
  }, []);

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
      console.log('Initializing notifications, current permission:', permission, 'subscription:', !!subscription);
      
      if (permission === 'default') {
        console.log('Requesting permission...');
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          console.log('Permission not granted:', newPermission);
          return false;
        }
      }

      if (permission === 'granted' && !subscription) {
        console.log('Subscribing to push notifications...');
        await subscribeToPush();
      } else if (subscription) {
        console.log('Already subscribed, skipping subscription');
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
        const { url, type, notificationType } = event.data.data;
        
        // If this is a reminder notification, suppress navigation (handled via actions)
        if (notificationType === 'reminder') {
          console.log('Suppressing navigation for reminder NOTIFICATION_CLICK');
          return;
        }
        
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
    clearSubscription,
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
