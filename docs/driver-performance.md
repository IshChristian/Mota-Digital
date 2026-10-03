# Driver performance statistics

Driver profiles link to Driving performance. Select 7, 30 or 90 days. These are rolling periods of 24-hour days, measured by server timestamps, and the screen displays the returned start/end dates in local time.

POST /api/driver/offers/:rideId/received acknowledges an offer opened by the driver app. Authentication and driver role are required. The server requires that the ride be assigned/notified to that driver and still active. It stores the first acknowledgment time; repeat views and concurrent duplicate acknowledgments do not create extra receipts. An acknowledgment failure does not block acceptance/decline. Such offers are absent from this dataset.

GET /api/driver/performance?days=30 returns only the authenticated driver's metrics. The offer receipt timestamp chooses the cohort. Its current ride outcomes provide accepted/completed/cancelled counts; these are not a separate count of rides completed during the date range. Offers another driver accepted are not accepted for this driver. Missing/deleted rides are excluded.

- Acceptance rate = accepted offers / acknowledged offers.
- Cancellation rate = driver cancellations / accepted offers.
- Passenger cancellations are displayed separately and do not increase driver cancellation rate.
- A zero denominator returns null and displays a dash.

Tracking starts with this feature. Historical notifiedDrivers records are not treated as proof of app receipt. Counts do not change tiers or impose penalties. New screens show loading, empty and retry states with responsive cards and explicit selected periods.

Deploy the backend before the mobile update. Ensure the DriverOfferReceipt indexes exist: unique driverId+rideId, driverId+receivedAt, and receivedAt TTL of 180 days. Model initialization waits before receipt writes. If production disables automatic indexes, create these indexes explicitly before release. Do not run syncIndexes indiscriminately against other collections.

Validation: TypeScript and 10 automated backend tests passed. Tests mock database operations and evaluate the cohort aggregation expressions against fixtures. Live MongoDB index/concurrency behavior and real-phone offer presentation/acknowledgment still require verification.

Tips, demand heatmaps, destination filters and automated safety remain follow-up work in driver-improvement-priorities.md.
