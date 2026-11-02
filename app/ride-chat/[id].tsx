import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { ridesApi, getApiErrorMessage } from "@/services/api";
import { useRealtimeEvent, useRealtimeStatus } from "@/hooks/useRealtime";
import { PassengerHeader } from "@/components/passenger/PassengerUI";

type Message = { _id: string; senderId: string; text: string; createdAt: string };
const QUICK = ["chat.quick_here", "chat.quick_way", "chat.quick_where", "chat.quick_call"];

export default function RideChat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { colors } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<FlatList<Message>>(null);
  const live = useRealtimeStatus() === "connected";

  const load = async () => {
    try { setMessages((await ridesApi.getMessages(id)).data.data); setError(""); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [id]);
  useEffect(() => { if (live) return; const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [live, id]);
  useRealtimeEvent("chatMessage", (data) => {
    if (String(data?.rideId) !== String(id) || !data.message) return;
    setMessages((m) => (m.some((x) => x._id === data.message._id) ? m : [...m, data.message]));
  });
  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50); }, [messages.length]);

  const send = async (body = text) => {
    const value = body.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const res = await ridesApi.sendMessage(id, value);
      setMessages((m) => [...m, res.data.data]);
      setText("");
      setError("");
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingHorizontal: 16 }}><PassengerHeader title={name || t("chat.title")} subtitle={t("chat.subtitle")} /></View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> : (
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m._id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 24 }}>{t("chat.empty")}</Text>}
          renderItem={({ item }) => {
            const mine = String(item.senderId) === String(user?.id);
            return (
              <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? colors.primary : colors.backgroundCard, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: mine ? 0 : 1, borderColor: colors.border }}>
                <Text style={{ color: mine ? "#fff" : colors.textPrimary, fontSize: 15 }}>{item.text}</Text>
                <Text style={{ color: mine ? "rgba(255,255,255,0.75)" : colors.textTertiary, fontSize: 11, marginTop: 4 }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            );
          }}
        />
      )}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error, paddingHorizontal: 16 }}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 8, flexWrap: "wrap" }}>
        {QUICK.map((key) => t(key)).map((q) => <TouchableOpacity key={q} onPress={() => send(q)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: colors.textPrimary }}>{q}</Text></TouchableOpacity>)}
      </View>
      <View style={{ flexDirection: "row", gap: 8, padding: 16, paddingBottom: insets.bottom + 12, alignItems: "center" }}>
        <TextInput value={text} onChangeText={setText} maxLength={500} placeholder={t("chat.placeholder")} placeholderTextColor={colors.textTertiary} onSubmitEditing={() => send()} returnKeyType="send"
          style={{ flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 16, backgroundColor: colors.inputBg, color: colors.textPrimary, borderWidth: 1, borderColor: colors.inputBorder }} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("chat.send")} disabled={sending || !text.trim()} onPress={() => send()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: sending || !text.trim() ? 0.5 : 1 }}>
          {sending ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
