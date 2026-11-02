import { useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { rideStyles } from "./rideStyles";

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={{ backgroundColor: colors.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 14 }} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function CancelSheet({ visible, busy, onKeep, onConfirm }: { visible: boolean; busy: boolean; onKeep: () => void; onConfirm: (reason: string) => void }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [reason, setReason] = useState("");
  const quick = ["Driver is too far", "Changed my plans", "Wrong pickup point", "Found another ride"];
  return (
    <Sheet visible={visible} onClose={onKeep}>
      <Text style={s.title}>{t("trip.cancel_request")}?</Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {quick.map((q) => <TouchableOpacity key={q} onPress={() => setReason(q)} style={[s.chip, reason === q && s.chipActive]}><Text style={s.chipText}>{q}</Text></TouchableOpacity>)}
      </View>
      <View style={s.inputBox}><TextInput style={s.input} value={reason} onChangeText={setReason} maxLength={300} placeholder={t("trip.cancel_reason")} placeholderTextColor={colors.textTertiary} /></View>
      <View style={s.row}>
        <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={onKeep}><Text style={s.secondaryText}>{t("trip.keep_ride")}</Text></TouchableOpacity>
        <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} disabled={busy} onPress={() => onConfirm(reason)}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("trip.cancel")}</Text>}</TouchableOpacity>
      </View>
    </Sheet>
  );
}

export function SosSheet({ visible, busy, hasContacts, onClose, onSend }: { visible: boolean; busy: boolean; hasContacts: boolean; onClose: () => void; onSend: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.row}><Feather name="alert-triangle" size={24} color={colors.error} /><Text style={s.title}>{t("trip.sos_title")}</Text></View>
      <Text style={s.body}>{t("trip.sos_body")}</Text>
      {!hasContacts ? <Text style={s.subtitle}>{t("trip.add_contacts_hint")}</Text> : null}
      <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, { backgroundColor: colors.error }]} disabled={busy} onPress={onSend}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("trip.sos_send")}</Text>}</TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => void Linking.openURL("tel:112")}><Feather name="phone" size={16} color={colors.textPrimary} /><Text style={s.secondaryText}>112</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={onClose}><Text style={s.secondaryText}>{t("trip.cancel")}</Text></TouchableOpacity>
    </Sheet>
  );
}

export function RatingSheet({ visible, driverName, fare, walletBalance, busy, onSkip, onSubmit, onSavePlace }: {
  visible: boolean; driverName: string; fare: number; walletBalance: number | null; busy: boolean;
  onSkip: () => void; onSubmit: (rating: number, comment: string, tip: number) => void; onSavePlace?: (label: "Home" | "Work") => void;
}) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState(0);
  const tips = [0, 200, 500, 1000].filter((v) => v === 0 || (walletBalance ?? 0) >= v);
  return (
    <Sheet visible={visible} onClose={onSkip}>
      <Text style={s.title}>{t("trip.rate_driver", { name: driverName })}</Text>
      <Text style={s.subtitle}>{fare.toLocaleString()} RWF</Text>
      <View style={[s.row, { justifyContent: "center", gap: 8 }]} accessibilityRole="adjustable" accessibilityLabel={`${rating} of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} onPress={() => setRating(n)} style={{ padding: 6 }}>
            <Feather name="star" size={34} color={n <= rating ? "#F59E0B" : colors.border} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.inputBox}><TextInput style={s.input} value={comment} onChangeText={setComment} maxLength={500} placeholder="Anything to share? (optional)" placeholderTextColor={colors.textTertiary} /></View>
      {tips.length > 1 ? (
        <>
          <Text style={s.label}>{t("trip.add_tip")}</Text>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {tips.map((v) => <TouchableOpacity key={v} onPress={() => setTip(v)} style={[s.chip, tip === v && s.chipActive]}><Text style={s.chipText}>{v ? `${v} RWF` : t("trip.no_tip")}</Text></TouchableOpacity>)}
          </View>
        </>
      ) : null}
      {onSavePlace ? (
        <View style={[s.row, { flexWrap: "wrap" }]}>
          <Text style={s.subtitle}>{t("trip.save_as")}:</Text>
          {(["Home", "Work"] as const).map((l) => <TouchableOpacity key={l} onPress={() => onSavePlace(l)} style={s.chip}><Feather name={l === "Home" ? "home" : "briefcase"} size={14} color={colors.primary} /><Text style={s.chipText}>{t(l === "Home" ? "trip.home" : "trip.work")}</Text></TouchableOpacity>)}
        </View>
      ) : null}
      <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} disabled={busy} onPress={() => onSubmit(rating, comment, tip)}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("trip.submit")}</Text>}</TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={onSkip}><Text style={s.secondaryText}>{t("trip.skip")}</Text></TouchableOpacity>
    </Sheet>
  );
}
