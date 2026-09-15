import { useState, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const { selectedRole } = useLocalSearchParams<{ selectedRole?: string }>();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    nationalId: "",
    password: "",
    role: selectedRole || "passenger",
    referralCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();

  const logoSource = isDark
    ? require("@/assets/images/logo-light.png")
    : require("@/assets/images/logo-dark.png");

  const update = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // Smart phone handling: display without +250 when starts with 07
  const handlePhoneChange = (raw: string) => {
    update("phone", raw);
  };

  // Get the phone for submission: if starts with 07, prepend +250
  const getSubmitPhone = () => {
    const raw = formData.phone.trim();
    if (raw.startsWith("+250")) return raw;
    if (raw.startsWith("07")) return "+250" + raw.slice(1);
    if (raw.startsWith("7")) return "+2507" + raw.slice(1);
    return raw;
  };

  const handleRegister = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.password || !formData.nationalId) {
      setError("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const submitData = {
        ...formData,
        phone: getSubmitPhone(),
        role: formData.role === "driver" ? "driver" : "client"
      };
      const res = await authApi.register(submitData);
      const data = res.data || {};
      
      // The backend returns { message, userId, payment }
      const uid = data.userId || (data.user && (data.user.id || data.user._id));
      
      if (uid) {
        // Go to confirm phone before sending OTP
        router.push({
          pathname: "/(auth)/confirm-phone",
          params: { userId: uid, phone: getSubmitPhone(), fromRegister: "1", email: formData.email },
        } as any);
      } else {
        setError(data.message || "Registration succeeded but failed to parse response.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={s.themeToggle} onPress={toggleTheme}>
          <Feather name={isDark ? "sun" : "moon"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={s.header}>
          <Image source={logoSource} style={s.logo} width={10} resizeMode="contain" />
          <Text style={s.title}>Create Account</Text>
          <Text style={s.subtitle}>
            Join MOTA as a {formData.role === "driver" ? "Driver" : "Passenger"}
          </Text>
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <InputField
          label="First Name"
          value={formData.firstName}
          onChangeText={(v: string) => update("firstName", v)}
          placeholder="Jean"
          required
          s={s} colors={colors}
        />
        <InputField
          label="Last Name"
          value={formData.lastName}
          onChangeText={(v: string) => update("lastName", v)}
          placeholder="Mutoni"
          required
          s={s} colors={colors}
        />

        <View style={s.inputGroup}>
          <Text style={s.label}>
            Phone Number <Text style={{ color: colors.primary }}>*</Text>
          </Text>
          <Text style={s.hint}>Start with 07... or +250...</Text>
          <View style={s.phoneRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="0788 123 456"
              placeholderTextColor={colors.textTertiary}
              value={formData.phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <InputField
          label="Email"
          value={formData.email}
          onChangeText={(v: string) => update("email", v)}
          placeholder="jean@example.com"
          keyboardType="email-address"
          s={s} colors={colors}
        />

        <InputField
          label="National ID"
          value={formData.nationalId}
          onChangeText={(v: string) => update("nationalId", v)}
          placeholder="1199880012345678"
          keyboardType="numeric"
          required
          s={s} colors={colors}
        />
        <InputField
          label="Password"
          value={formData.password}
          onChangeText={(v: string) => update("password", v)}
          placeholder="••••••••"
          secure
          required
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          s={s} colors={colors}
        />
        <InputField
          label="Referral Code (Optional)"
          value={formData.referralCode}
          onChangeText={(v: string) => update("referralCode", v)}
          placeholder="MOTA-XXXX"
          s={s} colors={colors}
        />

        <TouchableOpacity style={s.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>{t("register")}</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={s.link}>{t("login")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const InputField = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
  required,
  hint,
  showPassword,
  setShowPassword,
  s,
  colors,
}: any) => (
  <View style={s.inputGroup}>
    <Text style={s.label}>
      {label}
      {required ? <Text style={{ color: colors.primary }}> *</Text> : null}
    </Text>
    {hint ? <Text style={s.hint}>{hint}</Text> : null}
    {secure ? (
      <View style={s.passwordContainer}>
        <TextInput
          style={s.passwordInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity style={s.eyeIcon} onPress={() => setShowPassword?.(!showPassword)}>
          <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    ) : (
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    )}
  </View>
));

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
    },
    themeToggle: {
      alignSelf: "flex-end",
      padding: 8,
    },
    backBtn: {
      marginBottom: 8,
      padding: 4,
      alignSelf: "flex-start",
    },
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    logo: {
      width: 160,
      height: 60,
      marginBottom: 12,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginTop: 4,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 6,
    },
    hint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 14,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    passwordInput: {
      flex: 1,
      padding: 14,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    eyeIcon: {
      padding: 14,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      marginBottom: 16,
      textAlign: "center",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 24,
    },
    footerText: {
      color: colors.textSecondary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    link: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
  });
