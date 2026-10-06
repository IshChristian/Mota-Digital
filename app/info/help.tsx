import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Alert } from "@/components/GlobalAlert";
import { supportApi, uploadsApi, getApiErrorMessage } from "@/services/api";
import { pickUploadDocument } from "@/services/documentPicker";
const categories = [
  ["account_kyc", "Account & verification"],
  ["upload", "File upload"],
  ["availability", "Going online"],
  ["payment", "Ride payment"],
  ["withdrawal", "Withdrawal"],
  ["fuel", "Fuel service"],
  ["technical", "App problem"],
  ["lost_item", "Lost item"],
  ["safety", "Safety concern"],
  ["other", "Other"],
];
export default function Help() {
  const { user, isAuthenticated, refreshAccount } = useAuth(),
    { colors } = useTheme(),
    router = useRouter(),
    params = useLocalSearchParams<{
      caseId?: string;
      category?: string;
      rideId?: string;
    }>(),
    client = useQueryClient();
  const [caseId, setCaseId] = useState(params.caseId || ""),
    [category, setCategory] = useState(params.category || "technical"),
    [subject, setSubject] = useState(""),
    [description, setDescription] = useState(""),
    [reply, setReply] = useState(""),
    [attachments, setAttachments] = useState<
      Array<{ url: string; name: string }>
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setCaseId(params.caseId || "");
    setReply("");
  }, [params.caseId]);
  useEffect(() => {
    setAttachments([]);
    setSubject("");
    setDescription("");
    setReply("");
    setPage(1);
  }, [user?.id]);
  const list = useQuery({
    queryKey: ["support", user?.id, "list", page],
    enabled: isAuthenticated,
    queryFn: async () => (await supportApi.list(page)).data,
    refetchInterval: 30000,
  });
  const detail = useQuery({
    queryKey: ["support", user?.id, caseId],
    enabled: isAuthenticated && !!caseId,
    queryFn: async () => (await supportApi.details(caseId)).data.data,
    refetchInterval: 15000,
  });
  const perform = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      await client.invalidateQueries({ queryKey: ["support", user?.id] });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const button = (title: string, action: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={busy}
      onPress={action}
      style={[
        s.button,
        { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
      ]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
  const field = (
    label: string,
    value: string,
    change: (value: string) => void,
    multiline = false,
  ) => (
    <View style={s.field}>
      <Text style={[s.label, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={change}
        multiline={multiline}
        maxLength={multiline ? 4000 : 160}
        style={[
          s.input,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.backgroundCard,
          },
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
        accessibilityLabel={label}
      />
    </View>
  );
  const item = detail.data;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Help & support" close />
        <Text style={[s.label, { color: colors.textPrimary }]}>
          Help with your MOTA account, trips and payments
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          For immediate danger, contact local emergency services. Support
          tickets are not monitored emergency calls.
        </Text>
        {!!process.env.EXPO_PUBLIC_SUPPORT_PHONE &&
          button(
            "Call MOTA support",
            () =>
              void Linking.openURL(
                `tel:${process.env.EXPO_PUBLIC_SUPPORT_PHONE}`,
              ).catch(() =>
                Alert.alert(
                  "Cannot make a call",
                  "Try contacting support by email.",
                ),
              ),
          )}
        {button(
          "Email support",
          () =>
            void Linking.openURL(
              `mailto:${process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@mota.rw"}?subject=MOTA%20Support`,
            ).catch(() =>
              Alert.alert(
                "Cannot open email",
                "Use the support request below.",
              ),
            ),
        )}
        {!isAuthenticated ? (
          button("Sign in to track support requests", () =>
            router.push("/(auth)/welcome" as any),
          )
        ) : (
          <>
            <View style={[s.card, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[s.label, { color: colors.textPrimary }]}>
                Account readiness
              </Text>
              {[
                ["Phone verified", user?.isVerified],
                ["Full KYC", user?.kycLevel === "full"],
                ...(user?.role === "driver"
                  ? [["Registration fee paid", user?.registrationPaid]]
                  : []),
                ["Account active", user?.isActive],
              ].map(([label, done]) => (
                <Text
                  key={String(label)}
                  style={{
                    color: done ? colors.textPrimary : colors.primary,
                    paddingVertical: 5,
                  }}
                >
                  {done ? "✓" : "○"} {String(label)}
                </Text>
              ))}
              {user?.role === "driver" && (
                <Text style={{ color: colors.textSecondary }}>
                  Availability:{" "}
                  {user.availabilityManuallyOffline
                    ? "Manually offline"
                    : user.isOnline
                      ? "Online"
                      : "Not online — check account requirements"}
                </Text>
              )}
              {button("Review remaining steps", () =>
                router.push("/(auth)/verification-progress" as any),
              )}
              {button(
                "Refresh account status",
                () =>
                  void perform(async () => {
                    await refreshAccount();
                  }),
              )}
            </View>
            {(error || list.error || detail.error) && (
              <View
                accessibilityRole="alert"
                style={[
                  s.card,
                  { borderWidth: 1, borderColor: colors.primary },
                ]}
              >
                <Text style={{ color: colors.primary }}>
                  {error || getApiErrorMessage(list.error || detail.error)}
                </Text>
                {button("Retry", () => {
                  void list.refetch();
                  if (caseId) void detail.refetch();
                })}
              </View>
            )}
            {busy && <ActivityIndicator color={colors.primary} />}
            {caseId ? (
              <>
                {button("Back to my requests", () => {
                  setCaseId("");
                  setReply("");
                })}
                {detail.isLoading ? (
                  <ActivityIndicator />
                ) : (
                  item && (
                    <View
                      style={[
                        s.card,
                        { backgroundColor: colors.backgroundCard },
                      ]}
                    >
                      <Text
                        selectable
                        style={[s.label, { color: colors.textPrimary }]}
                      >
                        {item.reference}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        Status: {item.status.replaceAll("_", " ")}
                      </Text>
                      <Text style={[s.label, { color: colors.textPrimary }]}>
                        {item.subject}
                      </Text>
                      <Text style={{ color: colors.textPrimary }}>
                        {item.description}
                      </Text>
                      {item.attachments?.map((file: any) => (
                        <Text
                          key={file.url}
                          style={{ color: colors.primary, paddingVertical: 7 }}
                          onPress={() =>
                            void Linking.openURL(file.url).catch(() =>
                              setError("Cannot open this attachment."),
                            )
                          }
                        >
                          {file.name}
                        </Text>
                      ))}
                      {item.resolution && (
                        <Text style={{ color: colors.textPrimary }}>
                          Resolution: {item.resolution}
                        </Text>
                      )}
                      {item.messages?.map((message: any, i: number) => (
                        <View
                          key={i}
                          style={[
                            s.card,
                            { borderWidth: 1, borderColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[s.label, { color: colors.textPrimary }]}
                          >
                            {message.authorType === "staff"
                              ? "MOTA support"
                              : "You"}
                          </Text>
                          <Text style={{ color: colors.textPrimary }}>
                            {message.text}
                          </Text>
                          <Text style={{ color: colors.textSecondary }}>
                            {new Date(message.createdAt).toLocaleString()}
                          </Text>
                        </View>
                      ))}
                      {field(
                        ["resolved", "closed"].includes(item.status)
                          ? "Why do you need to reopen this case?"
                          : "Your reply",
                        reply,
                        setReply,
                        true,
                      )}
                      {button(
                        ["resolved", "closed"].includes(item.status)
                          ? "Reopen request"
                          : "Send reply",
                        () =>
                          void perform(async () => {
                            if (!reply.trim())
                              throw Error("Enter your message first.");
                            if (["resolved", "closed"].includes(item.status))
                              await supportApi.reopen(caseId, reply.trim());
                            else await supportApi.reply(caseId, reply.trim());
                            setReply("");
                          }),
                      )}
                    </View>
                  )
                )}
              </>
            ) : (
              <>
                <Text style={[s.label, { color: colors.textPrimary }]}>
                  New support request
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  Choose a category
                </Text>
                <View style={s.categories}>
                  {categories.map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === key }}
                      onPress={() => setCategory(key)}
                      style={[
                        s.choice,
                        {
                          borderColor:
                            category === key ? colors.primary : colors.border,
                          backgroundColor:
                            category === key
                              ? colors.primary
                              : colors.backgroundCard,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            category === key ? "white" : colors.textPrimary,
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {field("Subject", subject, setSubject)}
                {field(
                  "Describe what happened",
                  description,
                  setDescription,
                  true,
                )}
                <Text style={{ color: colors.textSecondary }}>
                  Do not include passwords, PINs or payment OTPs.{" "}
                  {params.rideId ? "Your trip reference will be attached." : ""}
                </Text>
                {attachments.map((file) => (
                  <View key={file.url} style={s.attachment}>
                    <Text style={{ flex: 1, color: colors.textPrimary }}>
                      Uploaded: {file.name}
                    </Text>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() =>
                        setAttachments((old) =>
                          old.filter((a) => a.url !== file.url),
                        )
                      }
                    >
                      <Text style={{ color: colors.primary }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {button(
                  "Attach a file (up to 5, 20 MB each)",
                  () =>
                    void perform(async () => {
                      if (attachments.length >= 5)
                        throw Error("Attach up to five files.");
                      const file = await pickUploadDocument();
                      if (!file) return;
                      const result = await uploadsApi.upload({
                        uri: file.uri,
                        name: file.name,
                        mimeType: file.mimeType,
                      });
                      const url = result.data?.data?.url || result.data?.url;
                      if (!url)
                        throw Error("Upload did not return a file URL.");
                      setAttachments((old) => [
                        ...old,
                        { url, name: file.name },
                      ]);
                    }),
                )}
                {button(
                  "Send support request",
                  () =>
                    void perform(async () => {
                      if (!subject.trim() || !description.trim())
                        throw Error("Enter a subject and description.");
                      const response = await supportApi.create({
                        subject: subject.trim(),
                        description: description.trim(),
                        category,
                        rideId: params.rideId || undefined,
                        attachments,
                      });
                      setCaseId(response.data.data._id);
                      setSubject("");
                      setDescription("");
                      setAttachments([]);
                      Alert.alert(
                        "Request received",
                        "Your case reference and replies are available here.",
                      );
                    }),
                )}
                <Text style={[s.label, { color: colors.textPrimary }]}>
                  My requests
                </Text>
                {list.isLoading && <ActivityIndicator />}
                {list.data?.data?.map((ticket: any) => (
                  <TouchableOpacity
                    key={ticket._id}
                    onPress={() => setCaseId(ticket._id)}
                    style={[s.card, { backgroundColor: colors.backgroundCard }]}
                  >
                    <Text style={[s.label, { color: colors.textPrimary }]}>
                      {ticket.subject}
                    </Text>
                    <Text style={{ color: colors.textSecondary }}>
                      {ticket.status.replaceAll("_", " ")} ·{" "}
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={{ color: colors.textSecondary }}>
                      Target reply:{" "}
                      {ticket.responseDueAt
                        ? new Date(ticket.responseDueAt).toLocaleString()
                        : "Support will review your request"}{" "}
                      (estimate)
                    </Text>
                  </TouchableOpacity>
                ))}
                {page > 1 &&
                  button("Previous requests", () => setPage(page - 1))}
                {list.data?.total > page * 20 &&
                  button("More requests", () => setPage(page + 1))}
                {!list.isLoading && !list.error && !list.data?.data?.length && (
                  <Text style={{ color: colors.textSecondary }}>
                    You have no support requests yet.
                  </Text>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, paddingBottom: 50, gap: 16 },
  button: { padding: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  card: { padding: 16, borderRadius: 16, gap: 10 },
  label: { fontSize: 17, fontWeight: "700" },
  field: { gap: 8 },
  input: { borderWidth: 1, padding: 14, borderRadius: 12, fontSize: 16 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 2, padding: 10, borderRadius: 12 },
  attachment: { flexDirection: "row", gap: 12, alignItems: "center" },
});
