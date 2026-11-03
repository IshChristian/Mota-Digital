import { safeBack } from "@/utils/navigation";
// Fine loans. The flow: 1) the driver sends a traffic fine (ticket number + amount)
// for review, 2) an admin approves it, 3) the driver requests a loan for that
// ticket, 4) an admin approves the loan and MOTA pays the fine, 5) the driver
// repays from the wallet, by hand or automatically from each ride.
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

import { financeApi, fineRequestsApi, getApiErrorMessage, loansApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { Alert } from "@/components/GlobalAlert";
import { useFinanceStore } from "@/store/financeStore";

type LoanStatus = "pending" | "active" | "overdue" | "successful" | "defaulted" | "rejected";
type Loan = { _id: string; loanStatus: LoanStatus; loanAmount: number; totalWithInterest: number; remainingBalance: number; interestRate: number; tinNumber?: string; ticketNumber?: string; dueDate?: string; createdAt: string };
type FineRequest = { _id: string; fineId: string; amount: number; status: "pending" | "under_review" | "approved" | "rejected"; reason?: string; reviewNotes?: string; createdAt: string };
type Tab = "all" | "pending" | "repaying" | "paid" | "closed";

const TABS: Tab[] = ["all", "pending", "repaying", "paid", "closed"];
const inTab = (loan: Loan, tab: Tab) =>
  tab === "all" ||
  (tab === "pending" && loan.loanStatus === "pending") ||
  (tab === "repaying" && (loan.loanStatus === "active" || loan.loanStatus === "overdue")) ||
  (tab === "paid" && loan.loanStatus === "successful") ||
  (tab === "closed" && (loan.loanStatus === "rejected" || loan.loanStatus === "defaulted"));
const AMBER = "#F59E0B";
const money = (n: number) => `${Math.round(n || 0).toLocaleString()} RWF`;
const tinFrom = (reason?: string) => reason?.match(/\b(\d{9})\b/)?.[1] ?? "";

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors } = useTheme();
  const s = styles(colors);
  const client = useQueryClient();
  const { eligibility, fetchEligibility } = useFinanceStore();

  const [tab, setTab] = useState<Tab>("all");
  const [repaying, setRepaying] = useState<string | null>(null);
  const [form, setForm] = useState<null | { ticket: string; tin: string; amount: string }>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEligibility();
    financeApi.getConsent().then((res) => {
      const consents = Array.isArray(res.data) ? res.data : [];
      const has = (type: string) => consents.some((c: any) => c.consentType === type);
      if (!has("lending_terms") || !has("savings_terms")) router.push("/finance-consent" as any);
    }).catch(() => {});
  }, []);

  const loans = useQuery({ queryKey: ["loans"], queryFn: async () => ((await loansApi.getMyLoans()).data?.data ?? []) as Loan[] });
  const fines = useQuery({ queryKey: ["fine-requests"], queryFn: async () => ((await fineRequestsApi.getMine(1, 50)).data?.requests ?? []) as FineRequest[] });
  const refresh = () => { fetchEligibility(); return client.invalidateQueries({ queryKey: ["loans"] }).then(() => client.invalidateQueries({ queryKey: ["fine-requests"] })); };

  const allLoans = loans.data ?? [];
  const shown = useMemo(() => allLoans.filter((l) => inTab(l, tab)), [allLoans, tab]);
  // Fines still waiting, or approved but without a loan yet.
  const loanTickets = new Set(allLoans.filter((l) => l.loanStatus !== "rejected").map((l) => l.ticketNumber));
  const openFines = (fines.data ?? []).filter((f) => f.status !== "rejected" && !(f.status === "approved" && loanTickets.has(f.fineId)));

  const openForm = (prefill?: Partial<{ ticket: string; tin: string; amount: string }>) => {
    if (eligibility?.eligible === false) {
      Alert.alert(t("loan.not_eligible"), eligibility?.reason || t("loan.not_eligible_text"));
      return;
    }
    setForm({ ticket: "", tin: "", amount: "", ...prefill });
  };

  const submit = async () => {
    if (!form) return;
    const ticket = form.ticket.trim().toUpperCase();
    const tin = form.tin.trim();
    const amount = Number(form.amount.replace(/[^\d]/g, ""));
    if (!ticket || !/^\d{9}$/.test(tin)) { Alert.alert(t("loan.check_form"), t("loan.check_form_text")); return; }
    setSubmitting(true);
    try {
      // If this ticket's fine is already approved, this is the loan request itself.
      const res = await loansApi.requestLoan({ tinNumber: tin, ticketNumber: ticket });
      const result = res.data?.data;
      setForm(null);
      Alert.alert(t("loan.requested"), result && !result.coversWholeFine
        ? t("loan.requested_partial", { amount: money(result.loan.loanAmount), fine: money(result.fineAmount) })
        : t("loan.requested_text"));
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status !== 404) { Alert.alert(t("loan.failed"), getApiErrorMessage(error)); return; }
      // No approved fine yet → send the fine for review first.
      if (!(amount > 0)) { Alert.alert(t("loan.need_amount"), t("loan.need_amount_text")); return; }
      try {
        await fineRequestsApi.submit({ fineId: ticket, amount, reason: `TIN ${tin}` });
        setForm(null);
        Alert.alert(t("loan.fine_sent"), t("loan.fine_sent_text"));
      } catch (fineError) {
        Alert.alert(t("loan.failed"), getApiErrorMessage(fineError));
      }
    } finally {
      setSubmitting(false);
      void refresh();
    }
  };

  const repay = (loan: Loan) => {
    Alert.alert(t("loan.repay_title"), t("loan.repay_confirm", { amount: money(loan.remainingBalance) }), [
      { text: t("loan.cancel"), style: "cancel" },
      { text: t("loan.repay"), onPress: async () => {
        setRepaying(loan._id);
        try {
          const res = await loansApi.repayLoan({ loanId: loan._id, amount: loan.remainingBalance });
          Alert.alert(t("loan.repaid"), t("loan.repaid_text", { balance: money(res.data?.data?.walletBalance ?? 0) }));
        } catch (error) {
          Alert.alert(t("loan.repay_failed"), getApiErrorMessage(error));
        } finally {
          setRepaying(null);
          void refresh();
        }
      } },
    ]);
  };

  const statusColor = (status: string) =>
    ({ pending: AMBER, under_review: AMBER, active: colors.primary, approved: colors.success, overdue: colors.error, defaulted: colors.error, successful: colors.success, rejected: colors.textSecondary } as Record<string, string>)[status] ?? colors.textSecondary;

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("loan.close")} onPress={() => safeBack(router)} style={s.iconBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={s.headerTitle}>{t("loans")}</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={loans.isRefetching || fines.isRefetching} onRefresh={() => void refresh()} tintColor={colors.primary} />}>
        <View style={s.card}>
          <Text style={s.heading}>{t("loan.how_title")}</Text>
          <Text style={s.text}>{t("loan.how_text")}</Text>
          {eligibility ? (
            <Text style={[s.small, { marginTop: 8, color: eligibility.eligible ? colors.success : colors.error }]}>
              {eligibility.eligible ? t("loan.limit", { amount: money(eligibility.maxAmount) }) : eligibility.reason}
            </Text>
          ) : null}
        </View>

        {openFines.length ? (
          <View style={s.card}>
            <Text style={s.heading}>{t("loan.fines")}</Text>
            {openFines.map((fine) => (
              <View key={fine._id} style={s.row}>
                <Feather name="file-text" size={18} color={statusColor(fine.status)} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{fine.fineId} · {money(fine.amount)}</Text>
                  <Text style={[s.small, { color: statusColor(fine.status) }]}>{t(`loan.fine_${fine.status}`)}</Text>
                </View>
                {fine.status === "approved" ? (
                  <TouchableOpacity accessibilityRole="button" onPress={() => openForm({ ticket: fine.fineId, tin: tinFrom(fine.reason), amount: String(fine.amount) })} style={s.smallBtn}>
                    <Text style={s.smallBtnText}>{t("loan.request")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((key) => {
            const count = allLoans.filter((l) => inTab(l, key)).length;
            const active = tab === key;
            return (
              <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setTab(key)} style={[s.tab, active && { backgroundColor: colors.primary }]}>
                <Text style={[s.tabText, active && { color: "#fff" }]}>{t(`loan.tab_${key}`)}{count ? ` · ${count}` : ""}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loans.isPending ? <ActivityIndicator color={colors.primary} /> : loans.isError ? (
          <View style={s.card}><Text style={s.text}>{getApiErrorMessage(loans.error)}</Text></View>
        ) : !shown.length ? (
          <View style={s.empty}>
            <Feather name="briefcase" size={40} color={colors.textSecondary} />
            <Text style={s.text}>{tab === "all" ? t("loan.empty") : t("loan.empty_tab")}</Text>
          </View>
        ) : shown.map((loan) => {
          const color = statusColor(loan.loanStatus);
          const open = loan.loanStatus === "active" || loan.loanStatus === "overdue";
          return (
            <View key={loan._id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
              <View style={[s.row, { alignItems: "flex-start" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.amount}>{money(loan.loanAmount)}</Text>
                  <Text style={s.small}>{t("loan.to_repay", { amount: money(loan.totalWithInterest), rate: String(loan.interestRate) })}</Text>
                </View>
                <Text style={[s.badge, { color, backgroundColor: `${color}1A` }]}>{t(`loan.status_${loan.loanStatus}`)}</Text>
              </View>
              <View style={s.details}>
                {loan.ticketNumber ? <Detail s={s} label={t("loan.ticket")} value={loan.ticketNumber} /> : null}
                {open ? <Detail s={s} label={t("loan.remaining")} value={money(loan.remainingBalance)} /> : null}
                {loan.dueDate && open ? <Detail s={s} label={t("loan.due")} value={new Date(loan.dueDate).toLocaleDateString()} /> : null}
                <Detail s={s} label={t("loan.requested_on")} value={new Date(loan.createdAt).toLocaleDateString()} />
              </View>
              {loan.loanStatus === "overdue" ? <Text style={[s.small, { color: colors.error }]}>{t("loan.overdue_note")}</Text> : null}
              {open ? <Text style={s.small}>{t("loan.auto_note")}</Text> : null}
              {open && loan.remainingBalance > 0 ? (
                <TouchableOpacity accessibilityRole="button" disabled={!!repaying} onPress={() => repay(loan)} style={s.repayBtn}>
                  {repaying === loan._id ? <ActivityIndicator color={colors.primary} /> : <Text style={s.repayText}>{t("loan.repay_all", { amount: money(loan.remainingBalance) })}</Text>}
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity accessibilityRole="button" onPress={() => openForm()} style={[s.fab, { bottom: insets.bottom + 24 }, eligibility?.eligible === false && { opacity: 0.5 }]}>
        <Feather name="plus" size={20} color="#fff" />
        <Text style={s.fabText}>{t("loan.request")}</Text>
      </TouchableOpacity>

      {form ? (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.heading}>{t("loan.form_title")}</Text>
            <Text style={s.text}>{t("loan.form_text")}</Text>
            <Field s={s} colors={colors} label={t("loan.ticket")} value={form.ticket} onChange={(ticket) => setForm({ ...form, ticket })} placeholder="TKT-2026-00123" caps />
            <Field s={s} colors={colors} label={t("loan.tin")} value={form.tin} onChange={(tin) => setForm({ ...form, tin: tin.replace(/\D/g, "") })} placeholder="123456789" numeric max={9} />
            <Field s={s} colors={colors} label={t("loan.fine_amount")} value={form.amount} onChange={(amount) => setForm({ ...form, amount: amount.replace(/\D/g, "") })} placeholder="10000" numeric />
            <View style={[s.row, { marginTop: 8 }]}>
              <TouchableOpacity accessibilityRole="button" onPress={() => setForm(null)} style={[s.modalBtn, { backgroundColor: colors.inputBg }]}>
                <Text style={[s.repayText, { color: colors.textSecondary }]}>{t("loan.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[s.modalBtn, { flex: 2, backgroundColor: colors.primary }]}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={[s.repayText, { color: "#fff" }]}>{t("loan.submit")}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Detail({ s, label, value }: { s: ReturnType<typeof styles>; label: string; value: string }) {
  return <View style={s.detail}><Text style={s.small}>{label}</Text><Text style={s.rowTitle}>{value}</Text></View>;
}

function Field({ s, colors, label, value, onChange, placeholder, numeric, caps, max }: { s: ReturnType<typeof styles>; colors: ThemeColors; label: string; value: string; onChange: (v: string) => void; placeholder: string; numeric?: boolean; caps?: boolean; max?: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.small}>{label}</Text>
      <TextInput accessibilityLabel={label} style={s.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textTertiary}
        keyboardType={numeric ? "number-pad" : "default"} autoCapitalize={caps ? "characters" : "none"} maxLength={max} />
    </View>
  );
}

const styles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  heading: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.textPrimary },
  text: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 20 },
  small: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },
  amount: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.textPrimary },
  badge: { fontSize: 11, fontFamily: "Inter_700Bold", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: "hidden" },
  details: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detail: { backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.inputBg },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary },
  empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  smallBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: `${colors.primary}1A` },
  smallBtnText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  repayBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: `${colors.primary}14`, borderWidth: 1, borderColor: `${colors.primary}33` },
  repayText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  fab: { position: "absolute", right: 24, height: 54, borderRadius: 27, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, elevation: 6 },
  fabText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 20 },
  modal: { backgroundColor: colors.backgroundCard, borderRadius: 20, padding: 20, gap: 12 },
  input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, padding: 14, color: colors.textPrimary, fontFamily: "Inter_500Medium", fontSize: 15 },
  modalBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 10 },
});
