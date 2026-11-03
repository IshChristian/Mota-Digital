import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";

type Props = {
  value: Date;
  mode?: "date" | "time";
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval?: number;
  display?: string;
  onValueChange?: (event: unknown, date?: Date) => void;
  onChange?: (event: unknown, date?: Date) => void;
  onDismiss?: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Browser version of @react-native-community/datetimepicker (which has no web
 * implementation and renders nothing). Uses the browser's own date/time input in
 * a small dialog and reports the choice the same way the native picker does.
 */
export default function DateTimePicker({ value, mode = "date", minimumDate, maximumDate, minuteInterval, onValueChange, onChange, onDismiss }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(mode === "time" ? toTime(value) : toDate(value));
  useEffect(() => { try { (input.current as any)?.showPicker?.(); } catch { /* needs a user gesture in some browsers */ } }, []);

  const done = () => {
    const next = new Date(value);
    if (mode === "time") {
      const [h, m] = text.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return cancel();
      next.setHours(h, m, 0, 0);
    } else {
      const [y, mo, d] = text.split("-").map(Number);
      if (!y || !mo || !d) return cancel();
      next.setFullYear(y, mo - 1, d);
    }
    let chosen = next;
    if (minimumDate && chosen < minimumDate) chosen = new Date(minimumDate);
    if (maximumDate && chosen > maximumDate) chosen = new Date(maximumDate);
    (onValueChange ?? onChange)?.({ type: "set" }, chosen);
  };
  // Only onDismiss: callers read the date from onValueChange without checking it.
  const cancel = () => onDismiss?.();

  return (
    <Modal transparent visible animationType="fade" onRequestClose={cancel}>
      <Pressable onPress={cancel} style={{ flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 360, backgroundColor: colors.backgroundCard, borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 18 }}>{t(mode === "time" ? "pages.picker.choose_time" : "pages.picker.choose_date")}</Text>
          <input
            ref={input}
            type={mode === "time" ? "time" : "date"}
            value={text}
            min={mode === "date" && minimumDate ? toDate(minimumDate) : undefined}
            max={mode === "date" && maximumDate ? toDate(maximumDate) : undefined}
            step={mode === "time" && minuteInterval ? minuteInterval * 60 : undefined}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") done(); }}
            style={{ fontSize: 18, padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.background, color: colors.textPrimary, colorScheme: "light dark", fontFamily: "inherit" }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity accessibilityRole="button" onPress={cancel} style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundElevated }}>
              <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold" }}>{t("pages.picker.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={done} style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>{t("pages.picker.done")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
