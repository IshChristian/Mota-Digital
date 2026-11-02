import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { notificationsApi } from './api';
import { RIDE_REQUEST_SOUND, RIDE_REQUEST_VIBRATION, isRideRequestEvent, startRideAlert } from './rideAlert';

export const RIDE_REQUEST_CHANNEL = 'ride_requests';

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
      handleNotification: async (notification) => {
        const data: any = notification.request.content.data ?? {};
        // App open: the in-app alert loops MOTA's sound and vibration, so the
        // notification itself stays quiet instead of playing a second sound.
        if (isRideRequestEvent(data.event)) {
          void startRideAlert(data.rideId);
          return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
        }
        return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false };
      },
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
    // New ride requests: MOTA's own sound, long vibration, shown on the lock screen.
    // (Android fixes a channel's sound when it is created, so this is a new channel id.)
    await Notifications.setNotificationChannelAsync(RIDE_REQUEST_CHANNEL, {
      name: 'New ride requests',
      description: 'Rings when a passenger nearby requests a ride',
      importance: Notifications.AndroidImportance.MAX,
      sound: RIDE_REQUEST_SOUND,
      vibrationPattern: RIDE_REQUEST_VIBRATION,
      enableVibrate: true,
      enableLights: true,
      lightColor: '#E63946',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
    await Notifications.setNotificationChannelAsync('rides', {
      name: 'Ride updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    // The server sends non-urgent messages (wallet, account, promotions) on "default".
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
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

/**
 * Sends a sample ride request alert in 5 seconds, so a driver can lock the phone,
 * put it in a pocket and check they would notice a real request.
 */
export async function sendTestRideAlert(title: string, body: string) {
  const Notifications = await getNotifications();
  if (!Notifications) throw new Error('Notifications are not available on this device.');
  if (Platform.OS === 'android') await registerForPushNotifications().catch(() => null); // makes sure the channel exists
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('permission');
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: RIDE_REQUEST_SOUND, data: { event: 'rideRequestTest' }, priority: Notifications.AndroidNotificationPriority.MAX },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: RIDE_REQUEST_CHANNEL },
  });
}
