# MOTA driver improvement order

## 1. Reliability and responsive screens — current change

Selected photos now provide their JPEG data from ImagePicker directly. The authenticated backend decodes it and uploads through the Cloudinary SDK. This avoids the reported native file-copy/read failure. Multipart remains available for other upload callers. The backend must be deployed before the mobile update. Real-device capture and Cloudinary delivery require a live smoke test; automated tests mock those services.

Shared headers, settings containers, driver dashboard cards, verification cards and the ride-request sheet now allow wrapping/shrinking and use bounded tablet widths. Real-device visual verification is still needed at 320/360/390 px, landscape, tablet and enlarged system text.

Availability, acceptance and payout flows remain existing implementations; this change does not claim to have verified them live.

## 2. Financial transparency — current change

The server includes commission and estimated take-home earnings on driver requests, realtime offers and ride details. The request sheet displays these before acceptance, plus duration when available. Take-home excludes fuel and other expenses. Rates come from backend configuration, not hard-coded mobile percentages.

## 3. Road-distance fares — current change

The fare estimator uses Google Routes road distance and traffic duration when GOOGLE_ROUTES_API_KEY or GOOGLE_MAPS_API_KEY is configured. A missing key, timeout or unavailable route keeps the existing straight-line estimate and marks distanceSource as straight_line_fallback in the estimation response. Car/moto-specific tariff configuration remains a separate follow-up; this change preserves current tariff settings.

## 4. Performance, tipping and payout visibility — next

Track delivered offers, acceptance and driver-initiated cancellations with clear denominators. Add tipping through server-verified payment settlement and transaction records. Provide payout progress and provider-minimum explanations. Test duplicate payment callbacks and reversals before release.

## 5. Planning and safety tools — after reliable core flows

Add demand heatmaps using aggregated recent requests, then destination filtering based on real routes. Add automated trip anomaly monitoring and incident handling. Trip recording needs consent, retention controls and restricted support access. Vehicle-display integrations come after these core features.

No feature in stages 4–5 is marked implemented by this change.
