export function notificationDestination(
  metadata: any,
  passenger: boolean,
): string | undefined {
  const valid = (value: unknown): value is string =>
    typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
  if (valid(metadata?.supportCaseId))
    return `/info/help?caseId=${metadata.supportCaseId}`;
  if (valid(metadata?.rideId))
    return passenger
      ? `/(passenger)/ride-details/${metadata.rideId}`
      : `/active-ride?rideId=${metadata.rideId}`;
  return undefined;
}
