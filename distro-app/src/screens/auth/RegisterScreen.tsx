import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { api } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import { AuthStackParamList } from "../../navigation/AuthStack";

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, "Register">;
};

export function RegisterScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    if (phone.length !== 10 || !phone.startsWith("9")) {
      setError("Enter a valid 10-digit Nepal phone number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/request-otp", { phone });
      navigation.navigate("OTP", { phone });
    } catch (err: any) {
      setError(err.message ?? "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>DISTRO</Text>
          <Text style={styles.tagline}>Wholesale, made simple.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            We'll send a verification code to your phone.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="98XXXXXXXX"
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
              placeholderTextColor={colors.gray400}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRequestOTP}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.link}>
              Already have an account?{" "}
              <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.blue },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: spacing.xl },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 4,
  },
  tagline: { color: colors.blueLight, fontSize: 14, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.gray600, marginTop: -spacing.xs },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  error: {
    color: "#DC2626",
    fontSize: 13,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  btn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  linkRow: { alignItems: "center", paddingVertical: spacing.xs },
  link: { color: colors.gray600, fontSize: 14 },
  linkBold: { color: colors.blue, fontWeight: "700" },
});
