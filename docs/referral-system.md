# Referral system

GET /api/referrals/me returns the authenticated user's code, aggregate counts, paid ledger total and 20 paginated records. It does not expose invitees' names, phones or documents. POST /api/referrals/check-rewards checks at most 20 pending referrals owned by the authenticated user. It respects FINANCIAL_WRITES_ENABLED. Retrying cannot credit the same new invitation twice.

Codes are optional, trimmed and uppercase. Invalid codes are rejected before user creation. Attribution and the configured reward are saved on the newly created user, allowing referral-record recovery. Notification failure does not invalidate registration. New agent-created drivers use the same configured reward.

Cash rewards apply to driver/agent referrers inviting drivers. Driver completion requires phone verification, full KYC, paid registration and approved registration. Other invitations complete after phone verification/full KYC with no cash reward. Passengers never pay registration fees. The reward is fixed at signup; changes in configuration affect future invitations.

For cash rewards, MongoDB transactions atomically update wallet balance, write a referral_reward transaction with unique idempotencyKey referral:<referredUserId>, and complete pending referral records. MongoDB must support transactions (replica set). Do not enable financial writes until deployed-database transaction/rollback tests pass. Verification hooks catch settlement errors so rewards stay pending instead of breaking approval. The app offers Check eligible rewards to retry.

Historical successful referrals are not paid again. Historical pending referrals without persisted user attribution need a manual ledger audit before migration, because the previous non-atomic implementation may already have credited a wallet before failing to update status. They are deliberately not auto-paid.

Automated tests simulate transaction rollback/concurrency and cover invalid codes, amounts, verification/payment gates, repeat checks and no-fee passenger invitations. Physical device, live MongoDB concurrency and deployed integration tests remain outstanding.
