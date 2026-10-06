import { useRouter } from "expo-router";
import { useEffect } from "react";

import { notificationDestination } from "@/services/notificationDestination";
import { isPassengerRole } from "@/constants/roles";
import { useAuth } from "@/context/AuthContext";
import {
  registerForPushNotifications,
  supportsPushNotifications,
} from "@/services/pushNotifications";

export function PushNotificationManager() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch((error) =>
      console.warn("Unable to register push notifications", error),
    );
  }, [isAuthenticated]);

  useEffect(() => {
    if (!supportsPushNotifications) return;

    let active = true;
    let removeListener: (() => void) | undefined;

    import("expo-notifications")
      .then((Notifications) => {
        if (!active) return;
        const subscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data ?? {};
            if (!isAuthenticated) return;
            const passenger = isPassengerRole(user?.role);
            const destination = notificationDestination(data, passenger);
            if (!destination) return;
            if (
              !data.supportCaseId &&
              !passenger &&
              data.event === "rideRequest"
            )
              router.push(`/ride-request/${data.rideId}` as any);
            else router.push(destination as any);
          });
        removeListener = () => subscription.remove();
      })
      .catch((error) =>
        console.warn(
          "Unable to initialize notification response listener",
          error,
        ),
      );

    return () => {
      active = false;
      removeListener?.();
    };
  }, [router, user?.role, isAuthenticated]);

  return null;
}
