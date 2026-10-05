import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { fuelVoucherApi } from "@/services/api";
import { Alert } from "@/components/GlobalAlert";

type Voucher = {
  id: string;
  code: string;
  type: "qr" | "momo";
  amount: number;
  status: string;
  issuedAt: string;
  expiresAt: string;
  qrImage?: string;
};
type Daily = {
  momoUsed: number;
  qrUsed: number;
  momoLimit: number;
  qrLimit: number;
  amount: number;
};
type Station = {
  id: string;
  name: string;
  address: string;
  acceptsQr: boolean;
};
const message = (error: any) =>
  error?.response?.data?.message ||
  error?.message ||
  "Please check your connection and retry.";
const money = (value: number) => `${value.toLocaleString()} RWF`;
const date = (value: string) => {
  const d = new Date(value);
  return Number.isFinite(+d) ? d.toLocaleString() : "Unavailable";
};

export default function FuelVouchersScreen() {
  const router = useRouter(),
    insets = useSafeAreaInsets(),
    { colors } = useTheme(),
    { user } = useAuth(),
    client = useQueryClient();
  const account = user?._id || user?.id,
    enabled = user?.role === "driver" && !!account;
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Voucher | null>(null);
  const locked = useRef(false),
    keys = useRef<Partial<Record<"qr" | "momo", string>>>({});
  const activeAccount = useRef(account);
  useEffect(() => {
    activeAccount.current = account;
    setSelected(null);
    setPage(1);
    keys.current = {};
  }, [account]);
  const prefix = ["fuel", account];
  const daily = useQuery({
    queryKey: [...prefix, "daily"],
    enabled,
    queryFn: async () =>
      (await fuelVoucherApi.getDailyStatus()).data.data as Daily,
  });
  const history = useQuery({
    queryKey: [...prefix, "history", page],
    enabled,
    queryFn: async () =>
      (await fuelVoucherApi.getHistory(page, 20)).data.data as {
        vouchers: Voucher[];
        total: number;
      },
  });
  const savings = useQuery({
    queryKey: [...prefix, "savings"],
    enabled,
    queryFn: async () =>
      (await fuelVoucherApi.getWeeklySavings()).data.data as {
        weekTotal: number;
      },
  });
  const stations = useQuery({
    queryKey: [...prefix, "stations"],
    enabled,
    queryFn: async () =>
      (await fuelVoucherApi.getStations()).data.data as Station[],
  });
  const refresh = () => client.invalidateQueries({ queryKey: prefix });
  const request = async (type: "qr" | "momo") => {
    if (locked.current || !daily.data || daily.isError) return;
    locked.current = true;
    setBusy(true);
    keys.current[type] ||=
      `fuel_${Date.now()}_${Math.random().toString(36).slice(2)}_${type}`;
    try {
      const response = await (type === "qr"
        ? fuelVoucherApi.claimQR(keys.current[type])
        : fuelVoucherApi.claimMoMo(keys.current[type]));
      const voucher: Voucher = response.data.data;
      if (!voucher?.id || !voucher.code || !voucher.status)
        throw new Error(
          "The server did not return a confirmed voucher. Retry to recover your request.",
        );
      if (activeAccount.current !== account) return;
      delete keys.current[type];
      setSelected(voucher);
      await refresh();
    } catch (error) {
      Alert.alert("Fuel request could not be confirmed", message(error));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const openVoucher = async (voucher: Voucher) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const result = (await fuelVoucherApi.getVoucher(voucher.id)).data.data;
      if (activeAccount.current === account) setSelected(result);
    } catch (error) {
      Alert.alert("Unable to open voucher", message(error));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: 20,
      gap: 20,
      paddingTop: insets.top + 12,
      paddingBottom: insets.bottom + 30,
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary,
      flexShrink: 1,
    },
    heading: { fontSize: 21, fontWeight: "700", color: colors.textPrimary },
    text: { fontSize: 16, lineHeight: 24, color: colors.textSecondary },
    button: {
      minHeight: 50,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
      flexShrink: 1,
    },
    status: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,.6)",
    },
    sheet: {
      maxHeight: "90%",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.backgroundCard,
    },
    qr: {
      width: 240,
      height: 240,
      maxWidth: "100%",
      alignSelf: "center",
      backgroundColor: "#fff",
    },
    code: {
      fontSize: 19,
      color: colors.textPrimary,
      fontWeight: "700",
      textAlign: "center",
    },
  });
  const button = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={s.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={daily.isRefetching}
            onRefresh={() => void refresh()}
          />
        }
        contentContainerStyle={s.content}
      >
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Feather name="arrow-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>MOTA fuel service</Text>
        <Text style={s.text}>
          Request fuel support, view your vouchers and track confirmed
          redemptions.
        </Text>
        {!enabled ? (
          <View style={s.card}>
            <Text style={s.heading}>Driver service</Text>
            <Text style={s.text}>
              Fuel support is available from an active driver account.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.heading}>Today's fuel support</Text>
              <Text style={s.text}>
                Daily limits reset at midnight in Kigali. Voucher values and
                availability come from MOTA.
              </Text>
              {daily.isPending ? (
                <ActivityIndicator color={colors.primary} />
              ) : daily.isError ? (
                <>
                  <Text style={s.text}>{message(daily.error)}</Text>
                  {button("Retry availability", () => void daily.refetch())}
                </>
              ) : daily.data ? (
                (["qr", "momo"] as const).map((type) => {
                  const remaining = Math.max(
                    0,
                    daily.data![`${type}Limit`] - daily.data![`${type}Used`],
                  );
                  return (
                    <View key={type} style={{ gap: 10, paddingVertical: 10 }}>
                      <Text style={s.heading}>
                        {type === "qr"
                          ? "Station QR voucher"
                          : "MoMo support request"}
                      </Text>
                      <Text style={s.text}>
                        {money(daily.data!.amount)} · {remaining} requests
                        remaining
                      </Text>
                      <Text style={s.text}>
                        {type === "qr"
                          ? "Show the confirmed QR code at an approved partner. An authorized attendant confirms redemption."
                          : "Submit a request for MOTA review. Pending requests are not a completed MoMo payment."}
                      </Text>
                      {button(
                        busy
                          ? "Please wait…"
                          : type === "qr"
                            ? "Request QR voucher"
                            : "Request MoMo support",
                        () => void request(type),
                        busy || remaining === 0,
                      )}
                    </View>
                  );
                })
              ) : null}
            </View>
            <View style={s.card}>
              <Text style={s.heading}>Confirmed fuel savings</Text>
              {savings.isPending ? (
                <ActivityIndicator />
              ) : savings.isError ? (
                <>
                  {<Text style={s.text}>Savings could not be loaded.</Text>}
                  {button("Retry savings", () => void savings.refetch())}
                </>
              ) : (
                <Text style={s.title}>
                  {money(savings.data?.weekTotal || 0)}
                </Text>
              )}
              <Text style={s.text}>
                Redeemed vouchers in the last 7 days. Pending requests do not
                count.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.heading}>Voucher history</Text>
              {history.isPending ? (
                <ActivityIndicator />
              ) : history.isError ? (
                <>
                  <Text style={s.text}>{message(history.error)}</Text>
                  {button("Retry history", () => void history.refetch())}
                </>
              ) : !history.data?.vouchers.length ? (
                <Text style={s.text}>Your fuel requests will appear here.</Text>
              ) : (
                history.data.vouchers.map((voucher) => (
                  <TouchableOpacity
                    key={voucher.id}
                    disabled={busy}
                    accessibilityRole="button"
                    onPress={() => void openVoucher(voucher)}
                    style={{
                      paddingVertical: 14,
                      gap: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={s.heading}>
                      {voucher.type === "qr" ? "QR voucher" : "MoMo request"} ·{" "}
                      {money(voucher.amount)}
                    </Text>
                    <Text style={s.status}>{voucher.status}</Text>
                    <Text style={s.text}>{date(voucher.issuedAt)}</Text>
                    <Text style={s.text}>View details →</Text>
                  </TouchableOpacity>
                ))
              )}
              <Text style={s.text}>Page {page}</Text>
              {page > 1 && button("Previous page", () => setPage((p) => p - 1))}
              {history.data &&
                page * 20 < history.data.total &&
                button("Next page", () => setPage((p) => p + 1))}
            </View>
            <View style={s.card}>
              <Text style={s.heading}>Approved fuel partners</Text>
              {stations.isPending ? (
                <ActivityIndicator />
              ) : stations.isError ? (
                <>
                  <Text style={s.text}>
                    Partner information could not be loaded.
                  </Text>
                  {button("Retry partners", () => void stations.refetch())}
                </>
              ) : !stations.data?.length ? (
                <Text style={s.text}>
                  No partner stations are currently listed. Contact MOTA support
                  before travelling to redeem a voucher.
                </Text>
              ) : (
                stations.data.map((station) => (
                  <View key={station.id}>
                    <Text style={s.heading}>{station.name}</Text>
                    <Text style={s.text}>{station.address}</Text>
                    <Text style={s.status}>
                      {station.acceptsQr
                        ? "Accepts MOTA QR"
                        : "Contact station for availability"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ScrollView
              contentContainerStyle={{
                padding: 24,
                paddingBottom: insets.bottom + 24,
                gap: 16,
              }}
            >
              <Text style={s.heading}>
                {selected?.type === "qr"
                  ? "Your fuel voucher"
                  : "MoMo request received"}
              </Text>
              <Text style={s.status}>{selected?.status}</Text>
              {selected?.qrImage && selected.status === "active" && (
                <Image
                  accessibilityLabel="Confirmed fuel voucher QR code"
                  source={{ uri: selected.qrImage }}
                  style={s.qr}
                  resizeMode="contain"
                />
              )}
              <Text selectable style={s.code}>
                {selected?.code}
              </Text>
              <Text style={s.text}>
                {selected ? money(selected.amount) : ""}
              </Text>
              <Text style={s.text}>
                Expires: {selected ? date(selected.expiresAt) : ""}
              </Text>
              <Text style={s.text}>
                {selected?.status === "pending"
                  ? "MOTA will review this request. No MoMo payment has been confirmed yet."
                  : selected?.status === "active"
                    ? "Show this code to an authorized fuel partner. Keep it private until redemption."
                    : "This voucher cannot be used again."}
              </Text>
              {button("Copy voucher code", () => {
                if (selected)
                  void Clipboard.setStringAsync(selected.code)
                    .then(() =>
                      Alert.alert(
                        "Code copied",
                        "Your voucher code is ready to paste.",
                      ),
                    )
                    .catch((error) =>
                      Alert.alert("Unable to copy", message(error)),
                    );
              })}
              {button("Done", () => setSelected(null))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
