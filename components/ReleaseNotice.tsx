import { useEffect } from "react";
import { Alert, Linking } from "react-native";
import Constants from "expo-constants";
import { releaseApi } from "@/services/api";

const parts = (version: string) => version.split(".").map((part) => Number(part));
const newer = (latest: string, installed: string) => {
  if (!/^\d+\.\d+\.\d+$/.test(latest) || !/^\d+\.\d+\.\d+$/.test(installed)) return false;
  const a = parts(latest), b = parts(installed);
  return a.some((value, index) => value > b[index] && a.slice(0, index).every((part, i) => part === b[i]));
};

export function ReleaseNotice() {
  useEffect(() => {
    let active = true;
    releaseApi.getLatest().then(({ data }) => {
      if (!active || !data.version || !newer(data.version, Constants.expoConfig?.version || "0.0.0")) return;
      const choices: { text: string; onPress?: () => void; style?: "cancel" }[] = [];
      if (data.downloaderUrl) choices.push({ text: "Back to downloader", onPress: () => void Linking.openURL(data.downloaderUrl!) });
      if (data.websiteUrl) choices.push({ text: "Official website", onPress: () => void Linking.openURL(data.websiteUrl!) });
      if (!choices.length) return;
      Alert.alert("MOTA update available", `Version ${data.version} is available. Open your original downloader or the official website, download the latest version, and install it.`, [...choices, { text: "Later", style: "cancel" }]);
    }).catch(() => { /* Release check must not block the app. */ });
    return () => { active = false; };
  }, []);
  return null;
}
