import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { registerForPushNotifications, supportsPushNotifications } from '@/services/pushNotifications';

export function PushNotificationManager() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch((error) => console.warn('Unable to register push notifications', error));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!supportsPushNotifications) return;

    let active = true;
    let removeListener: (() => void) | undefined;

    import('expo-notifications').then((Notifications) => {
      if (!active) return;
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data ?? {};
        const rideId = typeof data.rideId === 'string' ? data.rideId : null;
        if (!rideId) return;
        if (data.event === 'rideRequest') router.push(`/ride-request/${rideId}` as any);
        else router.push({ pathname: '/active-ride', params: { rideId } } as any);
      });
      removeListener = () => subscription.remove();
    }).catch((error) => console.warn('Unable to initialize notification response listener', error));

    return () => {
      active = false;
      removeListener?.();
    };
  }, [router]);

  return null;
}
