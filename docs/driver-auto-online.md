# Automatic driver availability

After login or secure session restoration, fetch the current account from the backend. A driver with full KYC, an active account, verified phone and paid registration fee automatically sends `PUT /driver/availability` with `isOnline: true` before the dashboard opens. No confirmation prompt is required. A driver who completes the last onboarding requirement during the session also becomes eligible.

Concurrent account refreshes share one request. Already-online drivers skip it; offline drivers retry on fresh account loading unless the server reports a saved manual-offline choice. The preference persists across app restarts. A completed new login clears it. Backend logout atomically clears online status while revoking credentials. Automatic online updates check the saved preference and token version atomically, so late requests cannot override manual offline or logout. Only a confirmed backend response marks the UI online. Backend refusals (including expired documents) and network failures show the custom alert, with Go Online retained for retry. Phone, fee, suspension, and document validity checks remain enforced by the server.

Dashboard queries are scoped to the signed-in user. Polling reconciles availability in an effect instead of dispatching component state inside the query function.

Validation: automatic login behavior, session restoration through the shared account-refresh path, eligibility filtering, later KYC completion, concurrent refreshes, session changes, failures and backend confirmation are covered by unit checks. Real Android login and ride-dispatch testing require a configured running backend.
