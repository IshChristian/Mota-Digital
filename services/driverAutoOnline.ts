type DriverAccount = {
  role: string;
  isOnline?: boolean;
  availabilityManuallyOffline?: boolean;
  kycLevel?: string;
  isActive?: boolean;
  isVerified?: boolean;
  registrationPaid?: boolean;
};

// Reconcile confirmed account status while respecting saved manual offline.
export function createDriverAutoOnline() {
  let attemptedToken: string | null = null;
  let pending: Promise<boolean | undefined> | null = null;
  return {
    reset() {
      attemptedToken = null;
      pending = null;
    },
    run(
      account: DriverAccount,
      token: string,
      currentToken: () => Promise<string | null>,
      goOnline: () => Promise<{ data?: { isOnline?: boolean } }>,
    ): Promise<boolean | undefined> {
      if (
        account.role !== "driver" ||
        account.isOnline === true ||
        account.availabilityManuallyOffline === true ||
        account.kycLevel !== "full" ||
        !account.isActive ||
        !account.isVerified ||
        !account.registrationPaid
      )
        return Promise.resolve(undefined);
      if (attemptedToken === token && pending) return pending;
      attemptedToken = token;
      const request = (async () => {
        if ((await currentToken()) !== token) return undefined;
        const result = await goOnline();
        if ((await currentToken()) !== token) return undefined;
        if (result.data?.isOnline !== true)
          throw new Error(
            "The server did not confirm that you are online. Try Go Online again.",
          );
        return true;
      })();
      const task = request.finally(() => {
        if (pending === task) pending = null;
      });
      pending = task;
      return task;
    },
  };
}
