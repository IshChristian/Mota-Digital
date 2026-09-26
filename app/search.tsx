import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { searchApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { EmptyState } from "@/components/driver/DriverUI";

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const search = async (term: string) => {
    const id = ++requestId.current;
    if (term.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const response = await searchApi.searchAll(term.trim());
      if (id !== requestId.current) return;
      const payload =
        response.data?.data ?? response.data?.results ?? response.data;
      setResults(Array.isArray(payload) ? payload : []);
    } catch (e: any) {
      if (id !== requestId.current) return;
      setError(
        e?.response?.data?.message || "Search is temporarily unavailable.",
      );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 300);
    return () => { clearTimeout(timer); requestId.current++; };
  }, [query]);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.back, { borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Search MOTA
        </Text>
      </View>
      <View
        style={[
          styles.search,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name="search" size={20} color={colors.textSecondary} />
        <TextInput
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void search(query)}
          placeholder="Search your rides and transactions"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.textPrimary }]}
        />
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <TouchableOpacity accessibilityLabel="Search" onPress={() => void search(query)}>
            <Feather name="arrow-right" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <FlatList
        data={results}
        keyExtractor={(item, index) => String(item._id ?? item.id ?? index)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="search"
              title={query ? "No matching results" : "Search across MOTA"}
              message={
                query
                  ? "Try another name, ride reference, or keyword."
                  : "Enter at least two characters to begin."
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.result,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
              {item.title ??
                item.name ??
                item.reference ??
                item.type ??
                "Result"}
            </Text>
            <Text style={{ color: colors.textSecondary }} numberOfLines={2}>
              {item.description ??
                item.email ??
                item.phone ??
                item.status ??
                ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 18, paddingTop: 58 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 27 },
  search: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, fontFamily: "Inter_400Regular" },
  error: { marginTop: 12, fontFamily: "Inter_500Medium" },
  list: { paddingVertical: 16, paddingBottom: 50 },
  result: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10 },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 4 },
});
