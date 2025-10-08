import { useEffect } from 'react';
import { useAuthStore } from '@/store/store';
import { handleNotificationAction } from '@/services/notificationActionService';

export const useNotificationActions = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('Received service worker message:', event.data);

      if (event.data.type === 'NOTIFICATION_ACTION') {
        const { action, data } = event.data;
        
        if (data.notificationType === 'reminder' && data.reminderId && user?.id) {
          console.log('Handling reminder notification action:', action, data);
          
          // Handle the notification action
          handleNotificationAction({
            action: action as 'mark-completed' | 'mark-not-done',
            reminderId: data.reminderId,
            userId: user.id,
          }).then((result) => {
            if (result.success) {
              console.log('Reminder action completed successfully');
              // You could show a toast notification here
              // toast.success('Reminder updated successfully');
            } else {
              console.error('Failed to handle reminder action:', result.error);
              // toast.error('Failed to update reminder');
            }
          });
        }
      }
    };

    // Add event listener for service worker messages
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [user?.id]);

  return {
    // You can expose additional functions here if needed
  };
};
