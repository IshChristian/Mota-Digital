import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage, productionApi } from "@/services/api";
import { legalDocuments, legalMenu } from "@/config/legalDocuments";

const information = {
  about: {
    title: "About MOTA",
    intro:
      "MOTA connects passengers and verified drivers with trackable rides, clear payment states, and operational support.",
    sections: [
      [
        "Mission",
        "Make everyday transport safer, easier to follow, and more financially useful for passengers and drivers.",
      ],
      [
        "How it works",
        "Passengers request rides, nearby drivers review and accept them, and both sides confirm important ride stages.",
      ],
      [
        "Operations",
        "Authorized support and administration teams monitor requests, disputes, payments, verification, and service health.",
      ],
    ],
  },
} as const;

const faqs = [
  [
    "How do I request a ride?",
    "Choose pickup and destination, review the fare and wallet balance, then submit the request.",
  ],
  [
    "Why can’t I start a ride?",
    "The driver arrival and passenger confirmation stages must be completed first.",
  ],
  [
    "How do wallet payments work?",
    "The backend verifies balance and transaction state. Pending or held funds are not shown as settled.",
  ],
  [
    "How do I contact support?",
    "Use the support actions below to call or email the MOTA support team.",
  ],
];

export default function InformationScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [query, setQuery] = useState("");
  const [accepting, setAccepting] = useState(false);
  const document = legalDocuments[page || ""];
  const infoDocument = information[page as keyof typeof information];
  const filteredFaqs = useMemo(
    () =>
      faqs.filter(([q, a]) =>
        `${q} ${a}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const acceptDocument = async () => {
    if (!document || !isAuthenticated) return;
    setAccepting(true);
    try {
      await productionApi.recordConsent({
        type: `legal:${document.slug}`,
        version: document.version,
        granted: true,
        source: "mobile_legal_center",
      });
      Alert.alert("Acceptance recorded", `Version ${document.version} was saved to your account.`);
    } catch (error) {
      Alert.alert("Unable to record acceptance", getApiErrorMessage(error) || "Please try again when connected.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={[styles.back, { borderColor: colors.border }]}
      >
        <Feather name="arrow-left" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      {page === "legal" ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Legal & Safety Center</Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Read the policies that govern accounts, rides, payments, location, safety and data rights. Country-specific notices may also apply.</Text>
          <View style={[styles.notice, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={20} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>These documents must be reviewed against the registered company details and each launch country's law before public release.</Text>
          </View>
          {legalMenu
            .map((slug) => legalDocuments[slug])
            .filter((item) => item.audience === "everyone" || item.audience === user?.role?.toLowerCase() || !isAuthenticated)
            .map((item) => (
              <TouchableOpacity key={item.slug} style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={() => router.push(`/info/${item.slug}` as any)}>
                <Feather name={item.slug === "safety" ? "shield" : "file-text"} size={22} color={colors.primary} />
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.cardSummary, { color: colors.textSecondary }]}>{item.summary}</Text>
                  <Text style={[styles.version, { color: colors.textTertiary }]}>Version {item.version}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
        </>
      ) : page === "contact" ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Contact MOTA
          </Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Reach the support team for ride, payment, verification, or account
            assistance.
          </Text>
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
            onPress={() => Linking.openURL("tel:+250000000000")}
          >
            <Feather name="phone" size={22} color={colors.primary} />
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Call support
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                +250 000 000 000
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
            onPress={() => Linking.openURL("mailto:support@mota.rw")}
          >
            <Feather name="mail" size={22} color={colors.primary} />
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Email support
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                support@mota.rw
              </Text>
            </View>
          </TouchableOpacity>
        </>
      ) : page === "help" ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Help center
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search help"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          />
          {filteredFaqs.map(([question, answer]) => (
            <View
              key={question}
              style={[
                styles.document,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {question}
              </Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {answer}
              </Text>
            </View>
          ))}
        </>
      ) : document ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {document.title}
          </Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            {document.summary}
          </Text>
          <View style={[styles.meta, { borderColor: colors.border }]}>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Version {document.version}</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Effective {document.effectiveDate}</Text>
          </View>
          {document.sections.map(({ heading, body }) => (
            <View
              key={heading}
              style={[
                styles.document,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {heading}
              </Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {body}
              </Text>
            </View>
          ))}
          {document.acceptanceRequired && isAuthenticated ? (
            <TouchableOpacity disabled={accepting} onPress={() => void acceptDocument()} style={[styles.accept, { backgroundColor: colors.primary, opacity: accepting ? 0.65 : 1 }]}>
              {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept version {document.version}</Text>}
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => router.push("/info/legal" as any)} style={styles.centerLink}>
            <Text style={{ color: colors.primary }}>View all legal and safety documents</Text>
          </TouchableOpacity>
        </>
      ) : infoDocument ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{infoDocument.title}</Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>{infoDocument.intro}</Text>
          {infoDocument.sections.map(([heading, body]) => (
            <View key={heading} style={[styles.document, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{heading}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Information unavailable
        </Text>
      )}
      {document ? <Text style={[styles.updated, { color: colors.textTertiary }]}>Effective: {document.effectiveDate} · Version {document.version}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 58, paddingBottom: 60, gap: 14 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 29 },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardCopy: { flex: 1 },
  cardSummary: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  version: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 5 },
  notice: { borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: "row", gap: 10 },
  noticeText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  meta: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginBottom: 4 },
  accept: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8 },
  acceptText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  centerLink: { alignItems: "center", paddingVertical: 12 },
  document: { borderWidth: 1, borderRadius: 18, padding: 18 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 5 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  updated: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 18,
  },
});
