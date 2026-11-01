type TrackingAccount = { role?: string; isActive?: boolean; isVerified?: boolean; registrationPaid?: boolean; kycLevel?: string };
export function canTrackDriverLocation(user: TrackingAccount | null | undefined, token: string | null | undefined): boolean {
  return !!token && user?.role === 'driver' && user.isActive === true && user.isVerified === true && user.registrationPaid === true && user.kycLevel === 'full';
}
// One request at a time; authorization denial suspends this watcher until account/session refresh.
export function createDriverLocationPublisher(send: (coordinates: {latitude: number; longitude: number}) => Promise<unknown>, blocked: (message: string) => void, unavailable: () => void) {
  let stopped = false, pending = false, failureShown = false;
  return {
    stop() { stopped = true; },
    isStopped() { return stopped; },
    async publish(coordinates: {latitude: number; longitude: number}) {
      if (stopped || pending || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) return;
      pending = true;
      try { await send(coordinates); failureShown = false; }
      catch (error: any) {
        if (stopped) return;
        if ([401,403].includes(error?.response?.status)) {
          stopped = true;
          blocked(error?.response?.data?.message || 'Your account cannot share driver location. Refresh your account or sign in again.');
        } else if (!failureShown) { failureShown = true; unavailable(); }
      } finally { pending = false; }
    },
  };
}
