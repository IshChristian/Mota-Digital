import React from "react";
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from "react-native";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import QRCode from "react-native-qrcode-svg";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Clipboard } from 'react-native';

const { width } = Dimensions.get("window");

export default function CardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const qrData = JSON.stringify({
    driverId: user?.id,
    phone: user?.phone,
    name: `${user?.firstName} ${user?.lastName}`
  });

  const last4 = user?.id ? user.id.slice(-4) : "0000";

  const copyToClipboard = () => {
    Clipboard.setString(user?.id || "");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>MOTA Card</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* Virtual Card */}
        <LinearGradient
          colors={["#1D3557", "#0A0E1A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.logo}>MOTA</Text>
            <Feather name="wifi" size={24} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
          </View>
          
          <View style={styles.cardBody}>
            <Text style={styles.cardNumber}>MOTA •••• •••• {last4}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>DRIVER</Text>
              <Text style={styles.cardName}>
                {(user?.firstName + " " + user?.lastName).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>TIER</Text>
              <Text style={styles.cardName}>{user?.tier?.toUpperCase() || 'BRONZE'}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={copyToClipboard}>
            <Feather name="copy" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionText}>Copy ID</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="share-2" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={styles.qrLabel}>Scan to pay or tip</Text>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrData}
              size={200}
              color={Colors.backgroundDark}
              backgroundColor={Colors.textPrimary}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  card: {
    width: width - 48,
    height: 220,
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  cardBody: {
    alignItems: "center",
  },
  cardNumber: {
    fontSize: 22,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  qrContainer: {
    marginTop: 48,
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  qrWrapper: {
    backgroundColor: Colors.textPrimary,
    padding: 20,
    borderRadius: 20,
  },
});
