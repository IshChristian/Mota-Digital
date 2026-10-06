# Driver location permissions

The screenshot shows a 403 from the protected driver location endpoint. Backend middleware requires an authenticated driver, phone verification, paid registration, full KYC and an active account. The exact failed condition cannot be identified from the screenshot alone; its backend response message is now shown in a custom alert.

GPS and ride-event subscriptions start only when local account state satisfies those requirements. Permission/service checks stop before watching if GPS is unavailable. Authorization failures stop location publishing and offer an explicit account refresh; transient errors retain retries without repeated warning overlays. Only one location request is in flight. Cleanup prevents updates and alerts after unmount/session change and removes watchers even when setup completes late.

Validation: driver-location publisher tests and TypeScript checking. No backend authorization is weakened. Real device GPS/API checks remain pending.
