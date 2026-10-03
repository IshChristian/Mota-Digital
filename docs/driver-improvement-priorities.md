# MOTA recommendation roadmap

## 1. Reliability and onboarding — implemented code; live validation needed

Uploads now go directly to Cloudinary using an unsigned preset. Configure EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET; see unsigned-cloudinary-uploads.md. Native upload uses Expo native multipart; web sends a data URI. The app requires a secure Cloudinary URL before reporting success. Validate real-device uploads and deployed backend profile persistence.

Responsive containers, wrapping dashboard cards, verification cards and ride-request sheets are implemented. Check small screens, landscape, tablets and enlarged system text on devices. Phone verification and KYC apply to both accounts; passengers do not pay registration fees.

## 2. Referral transparency — implemented code; rollout checks needed

Drivers, passengers and agents can view/share codes and see invitation history. New eligible driver referrals use the configured reward at signup. Driver/agent referrers earn cash after the invitee completes phone verification, approved KYC, fee payment and registration approval. Passenger invitations do not earn cash or require registration payment. Wallet credit, ledger entry and referral completion commit together, with an idempotency key per referred user.

Deploy the companion backend, keep historical pending records under manual audit, and verify transactions on a MongoDB replica set before enabling financial writes. The amount currently configured is shown in the app; pending rewards are not wallet balances.

## 3. Financial transparency and road-distance fares — implemented code

Ride offers show server-estimated driver earnings and commission before acceptance, excluding fuel and operating costs. Google Routes road distance/duration is used when configured; failures retain the explicitly marked straight-line fallback. Separate car/moto tariffs remain a follow-up.

## 4. Performance statistics — follow-up, not implemented here

Record delivered offers, accepted offers and driver-initiated cancellations. Show acceptance and cancellation rates with clear time windows and denominators. Verify duplicate and late events before presenting statistics.

## 5. Tips and payout visibility — follow-up, not implemented here

Add rider tips only through verified payment settlement. Link tips to the completed ride, preserve transaction records, and test duplicate callbacks, reversals and refunds. Show queued, reviewed, paid and failed payout states.

## 6. Demand heatmaps — follow-up, not implemented here

Aggregate recent ride requests into location cells with minimum sample thresholds. Label freshness and distinguish demand from guaranteed income. Limit access and avoid exposing individual riders' locations.

## 7. Destination filters — follow-up, not implemented here

Match offers against an optional driver destination using actual routes and a documented detour limit. Show active filter state and expiry; provide a clear way to turn it off.

## 8. Automated safety — follow-up, not implemented here

Start with trip anomaly monitoring, rider/driver check-ins and reviewed incident escalation. Define false-positive handling and support response. Recording requires consent, retention limits and restricted access before release.
