import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";

const HEIGHT = 60;
const THUMB = 52;
const GAP = (HEIGHT - THUMB) / 2;
const CONFIRM_AT = 0.75;

/**
 * Slide right to confirm, so a pocket or a bumped phone cannot trigger it.
 * Keyboard (Enter/Space) and screen readers activate it directly.
 */
export function SlideButton({ label, onConfirm, disabled, loading, color, icon = "chevrons-right", style }: {
  label: string;
  onConfirm: () => unknown;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const t = useT();
  const background = color ?? colors.primary;
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [running, setRunning] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const off = Boolean(disabled || loading || running);
  const travel = Math.max(0, width - THUMB - GAP * 2);
  const back = () => Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();

  const confirm = async () => {
    if (latest.current.off) return;
    latest.current.off = true; // a second release or key press before the re-render must not fire twice
    setRunning(true);
    Animated.timing(x, { toValue: latest.current.travel, duration: 120, useNativeDriver: false }).start();
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try { await latest.current.onConfirm(); }
    finally { if (mounted.current) { setRunning(false); back(); } }
  };
  const latest = useRef({ off, travel, onConfirm, confirm });
  latest.current = { off, travel, onConfirm, confirm };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Sideways only: the page must still scroll when a finger starts on the button.
    onMoveShouldSetPanResponder: (_e, g) => !latest.current.off && g.dx > 4 && Math.abs(g.dx) > Math.abs(g.dy),
    onMoveShouldSetPanResponderCapture: (_e, g) => !latest.current.off && g.dx > 4 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_e, g) => x.setValue(Math.max(0, Math.min(latest.current.travel, g.dx))),
    onPanResponderRelease: (_e, g) => {
      const { travel: max } = latest.current;
      if (max > 0 && g.dx >= max * CONFIRM_AT) void latest.current.confirm();
      else back();
    },
    onPanResponderTerminate: back,
  })).current;

  const web: any = Platform.OS === "web" ? {
    tabIndex: off ? -1 : 0,
    onKeyDown: (e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void confirm(); } },
  } : null;

  return (
    <View
      {...pan.panHandlers}
      {...web}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: Boolean(loading || running) }}
      accessibilityActions={[{ name: "activate", label }]}
      onAccessibilityAction={() => void confirm()}
      onAccessibilityTap={() => void confirm()}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: background, opacity: disabled ? 0.5 : 1 }, Platform.OS === "web" ? ({ touchAction: "pan-y", userSelect: "none", cursor: off ? "default" : "grab" } as any) : null, style]}
    >
      <Animated.Text numberOfLines={2} adjustsFontSizeToFit style={[styles.label, { opacity: travel ? x.interpolate({ inputRange: [0, travel * 0.7], outputRange: [1, 0], extrapolate: "clamp" }) : 1 }]}>
        {t("drive.slide_to", { action: label })}
      </Animated.Text>
      <Animated.View style={[styles.thumb, { transform: [{ translateX: x }] }]}>
        {loading || running ? <ActivityIndicator color={background} /> : <Feather name={icon} size={24} color={background} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, minHeight: HEIGHT, borderRadius: HEIGHT / 2, justifyContent: "center", overflow: "hidden", width: "100%" },
  thumb: { position: "absolute", left: GAP, top: GAP, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  label: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center", paddingLeft: THUMB + 16, paddingRight: 18 },
});
