import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

export default function GuestMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();

  const [destination, setDestination] = useState("");
  const [fareEstimated, setFareEstimated] = useState(false);

  const handleGetFare = () => {
    if (!destination.trim()) {
      Alert.alert("Destination Required", "Please enter where you are going.");
      return;
    }
    setFareEstimated(true);
  };

  const handleRequestRide = () => {
    Alert.alert(
      "Create Account",
      "Create a MOTA account to request and track your ride.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Up", onPress: () => router.push("/(auth)/login") },
      ]
    );
  };

  const s = styles(colors, isDark);

  return (
    <View style={s.container}>
      {/* Map Area Simulation */}
      <View style={s.mapArea}>
        <View style={[s.mapOverlay, { paddingTop: insets.top + 16 }]}>
          <View style={s.header}>
            <Text style={s.logoText}>MOTA</Text>
            <TouchableOpacity onPress={toggleTheme} style={s.menuBtn}>
              <Feather name={isDark ? "sun" : "moon"} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={s.searchBar}>
            <Feather name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Where are you going?"
              placeholderTextColor={colors.textSecondary}
              value={destination}
              onChangeText={(text) => {
                setDestination(text);
                setFareEstimated(false);
              }}
            />
          </View>
        </View>

        {/* Simulated Map Content */}
        <View style={s.simulatedMapContent}>
          <Feather name="map" size={80} color={colors.border} style={{ opacity: 0.5, marginBottom: 20 }} />
          <Text style={s.simulatedMapText}>LIVE MAP AREA</Text>
          
          {/* Simulated Drivers/User */}
          <View style={[s.simMarker, { top: "30%", left: "20%" }]}><Text>🏍️</Text></View>
          <View style={[s.simMarker, { top: "45%", left: "70%" }]}><Text>🏍️</Text></View>
          <View style={[s.simMarker, { top: "60%", left: "30%" }]}><Text>🏍️</Text></View>
          
          <View style={[s.simUserMarker, { top: "50%", left: "50%" }]}>
            <View style={s.userDot} />
            <View style={s.userPulse} />
          </View>
        </View>
      </View>

      {/* Bottom Sheet UI */}
      <View style={[s.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={s.sheetHandle} />
        
        {!fareEstimated ? (
          <View>
            <View style={s.locationRow}>
              <View style={s.locationIconBox}>
                <Feather name="map-pin" size={16} color={colors.primary} />
              </View>
              <View style={s.locationTextContainer}>
                <Text style={s.locationLabel}>Current Location</Text>
                <Text style={s.locationValue}>Kigali, Rwanda</Text>
              </View>
            </View>
            
            <View style={s.connectorLine} />
            
            <View style={s.locationRow}>
              <View style={[s.locationIconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
                <Feather name="flag" size={16} color={colors.textSecondary} />
              </View>
              <View style={s.locationTextContainer}>
                <Text style={s.locationLabel}>Destination</Text>
                <Text style={s.locationValue}>{destination || "Choose destination"}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[s.primaryBtn, !destination.trim() && s.primaryBtnDisabled]} 
              onPress={handleGetFare}
              disabled={!destination.trim()}
            >
              <Text style={s.primaryBtnText}>Get Fare Estimate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={s.estimateHeader}>
              <Text style={s.estimateTitle}>Route Overview</Text>
              <TouchableOpacity onPress={() => setFareEstimated(false)}>
                <Feather name="edit-2" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.routeStats}>
              <View style={s.statBox}>
                <Feather name="navigation" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>8.4 km</Text>
                <Text style={s.statLabel}>Distance</Text>
              </View>
              <View style={s.statBox}>
                <Feather name="clock" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>24 min</Text>
                <Text style={s.statLabel}>Duration</Text>
              </View>
              <View style={s.statBox}>
                <Feather name="tag" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>2.5k - 3.5k</Text>
                <Text style={s.statLabel}>Est. RWF</Text>
              </View>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleRequestRide}>
              <Text style={s.primaryBtnText}>Request Ride</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapArea: { flex: 1, backgroundColor: isDark ? "#1f2937" : "#e5e7eb" },
  mapOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logoText: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.textPrimary, letterSpacing: 1 },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundCard, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.backgroundCard, borderRadius: 12, paddingHorizontal: 16, height: 54, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: colors.textPrimary },
  
  simulatedMapContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  simulatedMapText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.textTertiary, letterSpacing: 2 },
  simMarker: { position: "absolute", transform: [{ translateX: -10 }, { translateY: -10 }] },
  simUserMarker: { position: "absolute", width: 20, height: 20, transform: [{ translateX: -10 }, { translateY: -10 }], alignItems: "center", justifyContent: "center" },
  userDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, zIndex: 2 },
  userPulse: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, opacity: 0.2, zIndex: 1 },

  bottomSheet: { backgroundColor: colors.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primary}20`, alignItems: "center", justifyContent: "center" },
  locationTextContainer: { marginLeft: 16, flex: 1 },
  locationLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary },
  locationValue: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.textPrimary, marginTop: 2 },
  connectorLine: { width: 2, height: 24, backgroundColor: colors.border, marginLeft: 15, marginVertical: 4 },

  estimateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  estimateTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.textPrimary },
  routeStats: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.textPrimary },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginTop: 2 },

  primaryBtn: { backgroundColor: colors.primary, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 24 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
