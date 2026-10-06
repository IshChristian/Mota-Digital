export function notificationPage(value: any) {
  if (
    !value ||
    !Array.isArray(value.data) ||
    !Number.isInteger(value.totalItems) ||
    value.totalItems < 0 ||
    !Number.isInteger(value.totalPages) ||
    value.totalPages < 0
  ) {
    throw new Error("Could not read notifications. Please retry.");
  }
  return {
    items: value.data as any[],
    totalItems: value.totalItems as number,
    totalPages: Math.max(1, value.totalPages),
  };
}
