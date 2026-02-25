import { useEffect } from 'react';
import { useAuthStore } from '@/common/store/store';
import { handleNotificationAction } from '@/common/services/notificationActionService';

export const useNotificationActions = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    console.log('🎣 useNotificationActions: Hook initialized', {
      userId: user?.id,
      hasUser: !!user
    });

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('📨 Received service worker message:', {
        type: event.data?.type,
        action: event.data?.action,
        fullData: event.data
      });

      // Check if this is a notification action message
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        const { action, data } = event.data;

        console.log('🔔 Processing NOTIFICATION_ACTION:', {
          action,
          notificationType: data?.notificationType,
          reminderId: data?.reminderId,
          hasUserId: !!user?.id
        });

        // Validate we have all required data
        if (!data?.notificationType) {
          console.error('❌ Missing notificationType in action data');
          return;
        }

        if (!data?.reminderId) {
          console.error('❌ Missing reminderId in action data');
          return;
        }

        if (!user?.id) {
          console.error('❌ No user ID available');
          return;
        }

        // Handle reminder notifications
        if (data.notificationType === 'reminder') {
          console.log('✅ Valid reminder action, processing...', {
            action,
            reminderId: data.reminderId,
            notificationType: data.notificationType,
            userId: user.id
          });

          // Map the action from service worker to API action
          const apiAction = action as 'mark-completed' | 'mark-not-done';

          const requestData: any = {
            action: apiAction,
            reminderId: data.reminderId,
            userId: user.id,
          };

          handleNotificationAction(requestData).then((result) => {
            if (result.success) {
              console.log('✅ Reminder action completed successfully:', {
                action: apiAction,
                reminderId: data.reminderId,
                result: result.data
              });
            } else {
              console.error('❌ Failed to handle reminder action:', {
                action: apiAction,
                error: result.error
              });
            }
          }).catch((error) => {
            console.error('❌ Exception while handling reminder action:', error);
          });
        } else {
          console.log('ℹ️ Non-reminder notification type:', data.notificationType);
          // Handle other notification types here if needed
        }
      } else if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('👆 Notification body clicked (not an action):', event.data);
        // Handle regular notification clicks if needed
      } else {
        console.log('ℹ️ Other service worker message:', event.data?.type);
      }
    };

    // Add event listener for service worker messages
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('✅ Adding service worker message listener');
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    } else {
      console.warn('⚠️ Service Worker not supported in this browser');
    }

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up useNotificationActions hook');
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [user?.id]); // Re-run if user changes

  return {
    // You can expose additional functions here if needed
    userId: user?.id,
  };
};
