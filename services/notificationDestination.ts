// Where tapping a push notification should take the user.
// Ride ids from the payload are validated so a notification cannot inject routes.
const LIVE = ["requested", "searching", "accepted", "approaching", "arrived", "start_requested", "in_progress", "stop_requested", "awaiting_payment"];

export function notificationDestination(
  metadata: any,
  passenger: boolean,
): string | undefined {
  const valid = (value: unknown): value is string =>
    typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
  if (valid(metadata?.supportCaseId))
    return `/info/help?caseId=${metadata.supportCaseId}`;
  if (!valid(metadata?.rideId)) return undefined;
  const rideId = metadata.rideId;
  if (metadata?.event === "chatMessage") return `/ride-chat/${rideId}`;
  if (!passenger) return `/active-ride?rideId=${rideId}`;
  // A ride still in progress is followed live on the home screen; finished ones open their details.
  const live = LIVE.includes(metadata?.rideStatus) || ["rideAccepted", "driverApproaching", "driverArrived", "rideStartRequested", "rideStopRequested", "counterOffer", "paymentUpdate"].includes(metadata?.event);
  return live && metadata?.rideStatus !== "completed" ? "/(passenger)" : `/(passenger)/ride-details/${rideId}`;
}
