import { Linking, Platform, Share } from "react-native";
import { Alert, showMessage } from "@/components/GlobalAlert";
import { translate as t } from "@/context/I18nContext";

const hasWebShare = () => Platform.OS === "web" && typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

async function copy(text: string) {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(text); return; }
    throw new Error("Clipboard unavailable");
  }
  const Clipboard = await import("expo-clipboard");
  await Clipboard.setStringAsync(text);
}

/**
 * Shares text. Phones use the system share sheet; browsers use theirs when they
 * have one (mobile Chrome/Safari) and otherwise copy the text to the clipboard,
 * because React Native's Share throws on most desktop browsers.
 */
export async function shareMessage({ message, title }: { message: string; title?: string }) {
  if (Platform.OS !== "web") { await Share.share({ message, title }); return; }
  if (hasWebShare()) {
    try { await (navigator as any).share({ title, text: message }); return; }
    catch (error: any) { if (error?.name === "AbortError") return; /* fall back to copying */ }
  }
  try {
    await copy(message);
    showMessage(t("pages.share.copied"));
  } catch {
    Alert.alert(title || t("pages.share.title"), message);
  }
}

/** Saves text as a file: a download in browsers, the share sheet on phones. */
export async function saveTextFile(filename: string, content: string, title?: string) {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title, message: content });
}

/**
 * Calls a number. Phones (and phone browsers) open the dialer; a desktop browser
 * can't place calls, so it shows the number with a Copy button instead.
 */
export async function callNumber(phone: string) {
  const number = phone.startsWith("+") || phone.length <= 4 ? phone : `+${phone}`;
  const touch = Platform.OS !== "web" || (typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0);
  if (touch) { await Linking.openURL(`tel:${number}`); return; }
  Alert.alert(t("pages.share.call_title"), t("pages.share.call_body", { number }), [
    { text: t("pages.share.copy_number"), onPress: () => void copy(number).then(() => showMessage(t("pages.share.number_copied"))).catch(() => {}) },
    { text: "OK" },
  ]);
}
