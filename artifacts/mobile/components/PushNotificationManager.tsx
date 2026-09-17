import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { registerForPushNotifications } from '@/services/pushNotifications';

export function PushNotificationManager() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch((error) => console.warn('Unable to register push notifications', error));
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const rideId = typeof data.rideId === 'string' ? data.rideId : null;
      if (!rideId) return;
      if (data.event === 'rideRequest') router.push(`/ride-request/${rideId}` as any);
      else router.push({ pathname: '/active-ride', params: { rideId } } as any);
    });
    return () => subscription.remove();
  }, [router]);

  return null;
}
