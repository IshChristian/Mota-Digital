import React, { useMemo, useState } from "react";
import {
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

const legal = {
  privacy: {
    title: "Privacy policy",
    intro:
      "How MOTA collects, uses, stores, and protects account, identity, payment, ride, and location information.",
    sections: [
      [
        "Information we collect",
        "Account details, verified identity records, ride locations, device information, support messages, and payment references required to operate MOTA.",
      ],
      [
        "How information is used",
        "To provide rides, process payments, prevent misuse, meet legal obligations, resolve support cases, and improve service reliability.",
      ],
      [
        "Sharing and retention",
        "Information is shared only with authorized service providers and authorities when legally required. Records are retained only as long as operational or legal needs require.",
      ],
      [
        "Your controls",
        "Use Account and data controls to export your information or request account deletion. Some financial and safety records may need to be retained by law.",
      ],
    ],
  },
  terms: {
    title: "Terms of service",
    intro:
      "Rules for safely and fairly using MOTA passenger, driver, wallet, and support services.",
    sections: [
      [
        "Account responsibility",
        "Provide accurate information, protect your credentials, and use only your own account and wallet.",
      ],
      [
        "Ride conduct",
        "Passengers and drivers must follow applicable law, confirm ride stages truthfully, and report safety or payment disputes through support.",
      ],
      [
        "Payments",
        "Displayed prices, fees, holds, refunds, and settlement states are confirmed by backend transaction records. Do not treat a pending transaction as completed.",
      ],
      [
        "Suspension and disputes",
        "MOTA may restrict access when verification, fraud, safety, or legal checks require review. Contact support to appeal or resolve a restriction.",
      ],
    ],
  },
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
  const [query, setQuery] = useState("");
  const document = legal[page as keyof typeof legal];
  const filteredFaqs = useMemo(
    () =>
      faqs.filter(([q, a]) =>
        `${q} ${a}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

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
      {page === "contact" ? (
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
            {document.intro}
          </Text>
          {document.sections.map(([heading, body]) => (
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
        </>
      ) : (
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Information unavailable
        </Text>
      )}
      <Text style={[styles.updated, { color: colors.textTertiary }]}>
        Last updated: September 22, 2026
      </Text>
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
