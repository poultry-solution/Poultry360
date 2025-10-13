import axiosInstance from '@/common/lib/axios';

export interface NotificationActionData {
  reminderId: string;
  userId: string;
  action: 'mark-completed' | 'mark-not-done';
}

/**
 * Handle notification action (mark reminder as completed or not done)
 */
export const handleNotificationAction = async (data: NotificationActionData) => {
  try {
    const response = await axiosInstance.post('/notification-actions/action', {
      action: data.action,
      reminderId: data.reminderId,
      userId: data.userId,
    });

    if (response.data.success) {
      console.log('Notification action handled successfully:', response.data.message);
      return { success: true, data: response.data.data };
    } else {
      console.error('Failed to handle notification action:', response.data.error);
      return { success: false, error: response.data.error };
    }
  } catch (error: any) {
    console.error('Error handling notification action:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get notification action status
 */
export const getNotificationActionStatus = async (reminderId: string, userId: string) => {
  try {
    const response = await axiosInstance.get('/notification-actions/status', {
      params: { reminderId, userId }
    });

    if (response.data.success) {
      return { success: true, data: response.data.data };
    } else {
      return { success: false, error: response.data.error };
    }
  } catch (error: any) {
    console.error('Error getting notification action status:', error);
    return { success: false, error: error.message };
  }
};
