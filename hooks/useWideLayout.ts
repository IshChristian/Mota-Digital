import { Platform, useWindowDimensions } from "react-native";

/** Desktop/tablet browser layout: side panels instead of bottom sheets. Phones (and the native app) keep the mobile layout. */
export const WIDE_MIN_WIDTH = 900;

export function useWideLayout() {
  const { width, height } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= WIDE_MIN_WIDTH;
  return { wide, width, height, panelWidth: wide ? Math.min(440, Math.round(width * 0.36)) : width };
}

/** Centred, width-limited page content on wide browsers; full width everywhere else. */
export function pageFrame(wide: boolean, maxWidth = 860) {
  return wide ? ({ width: "100%", maxWidth, alignSelf: "center" } as const) : null;
}
