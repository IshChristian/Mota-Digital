import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { notificationsApi } from './api';

let registeredToken: string | null = null;
let notificationHandlerConfigured = false;

export const supportsPushNotifications =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

async function getNotifications() {
  if (!supportsPushNotifications) return null;

  const Notifications = await import('expo-notifications');
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }
  return Notifications;
}

export async function registerForPushNotifications() {
  if (!supportsPushNotifications || !Device.isDevice) return null;

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rides', {
      name: 'Ride updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is required for push notifications');

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationsApi.registerPushToken(token, Platform.OS as 'android' | 'ios');
  registeredToken = token;
  return token;
}

export async function unregisterPushNotifications() {
  if (!registeredToken) return;
  try {
    await notificationsApi.unregisterPushToken(registeredToken);
  } finally {
    registeredToken = null;
  }
}
