import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { movingApi } from "@/services/api";
import { ScreenHeader } from "@/components/ScreenHeader";
import { rideStyles } from "@/components/passenger/ride/rideStyles";
import { MOVING_SUPPORT_PHONE, TRUCK_PHOTOS, money, range, truckPhoto, type Move, type MovingCatalog } from "@/constants/moving";
import { callNumber } from "@/utils/share";
import { StatusPill } from "@/components/moving/StatusPill";
import { Photo } from "@/components/moving/parts";

/** MOTA HomeMove home: what it is, the trucks with real photos and prices, and the customer's moves. */
export default function MovingHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const s = rideStyles(colors);
  const params = useLocalSearchParams<{ src?: string; c?: string }>();
  const account = user?.id || user?._id;
  const catalog = useQuery({ queryKey: ["moving", "catalog"], queryFn: async () => (await movingApi.catalog()).data.data as MovingCatalog, staleTime: 10 * 60 * 1000 });
  const moves = useQuery({ queryKey: ["moving", "mine", account], enabled: !!account, queryFn: async () => (await movingApi.mine()).data.data as Move[] });
  const book = () => router.push({ pathname: "/move/new", params: { ...(params.src ? { src: params.src } : {}), ...(params.c ? { c: params.c } : {}) } } as any);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 + insets.bottom, width: "100%", maxWidth: 760, alignSelf: "center", gap: 16 }}
      refreshControl={<RefreshControl refreshing={moves.isRefetching} onRefresh={() => { void moves.refetch(); void catalog.refetch(); }} tintColor={colors.primary} />}>
      <ScreenHeader title={t("move.brand")} subtitle={t("move.tagline")} />

      <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.border }}>
        <Photo source={TRUCK_PHOTOS.medium} ratio={2.2} />
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={[s.title, { fontSize: 22 }]}>{t("move.hero_title")}</Text>
          <Text style={s.subtitle}>{t("move.hero_body")}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={book} style={[s.primaryBtn, { marginTop: 6 }]}>
            <Feather name="truck" size={18} color="#fff" /><Text style={s.primaryText}>{t("move.book")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {moves.data?.length ? (
        <View style={{ gap: 10 }}>
          <Text style={s.label}>{t("move.my_moves")}</Text>
          {moves.data.map((m) => (
            <TouchableOpacity key={m._id} accessibilityRole="button" onPress={() => router.push(`/move/${m._id}` as any)} style={[s.card, { gap: 6 }]}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{m.ref}</Text>
                <StatusPill status={m.status} />
              </View>
              <Text style={s.body} numberOfLines={1}>{m.from.name} → {m.to.name}</Text>
              <Text style={s.subtitle}>{m.quote?.amount ? money(m.quote.amount) : range(m.estimate?.min, m.estimate?.max)}{m.moveDate ? ` · ${new Date(m.moveDate).toLocaleDateString()}` : ""}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={[s.card, { gap: 12 }]}>
        <Text style={[s.title, { fontSize: 17 }]}>{t("move.how_title")}</Text>
        {(["how_1", "how_2", "how_3"] as const).map((k, i) => (
          <View key={k} style={[s.row, { alignItems: "flex-start" }]}>
            <View style={[s.iconBubble, { width: 28, height: 28 }]}><Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{i + 1}</Text></View>
            <Text style={[s.body, { flex: 1 }]}>{t(`move.${k}`)}</Text>
          </View>
        ))}
      </View>

      <Text style={s.label}>{t("move.step_truck")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {(catalog.data?.trucks || []).map((x) => {
          const fitsKey = `move.fits_${x.key}`;
          return (
            <TouchableOpacity key={x.key} accessibilityRole="button" onPress={book} style={{ flexGrow: 1, flexBasis: 160, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundElevated }}>
              <Photo source={truckPhoto(x)} ratio={1.6} />
              <View style={{ padding: 10, gap: 2 }}>
                <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{x.name}</Text>
                <Text style={s.subtitle} numberOfLines={1}>{t(fitsKey) === fitsKey ? x.fits : t(fitsKey)}</Text>
                <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{range(x.priceMin, x.priceMax)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {MOVING_SUPPORT_PHONE ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => callNumber(MOVING_SUPPORT_PHONE)} style={s.secondaryBtn}>
          <Feather name="phone" size={17} color={colors.textPrimary} /><Text style={s.secondaryText}>{t("move.call_team")}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}
