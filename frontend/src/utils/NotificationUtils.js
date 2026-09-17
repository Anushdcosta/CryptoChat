import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const requestNotificationPermissions = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      console.log('Native notification permissions:', result.display);
    } catch (e) {
      console.error('Error requesting native permissions:', e);
    }
  } else {
    // Web / Desktop
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error('Error requesting web permissions:', e);
      }
    }
  }
};

export const showNotification = async (title, body) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: new Date().getTime(), // unique ID
            schedule: { at: new Date(Date.now() + 100) }, // Schedule almost immediately
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (e) {
      console.error('Failed to show native notification:', e);
    }
  } else {
    // Web / Desktop
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (e) {
        console.error('Failed to show web notification:', e);
      }
    }
  }
};
