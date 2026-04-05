import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { colors, spacing, radius } from "../../lib/theme";
import { AuthStackParamList } from "../../navigation/AuthStack";

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, "OTP">;
  route: RouteProp<AuthStackParamList, "OTP">;
};

const OTP_LENGTH = 6;

export function OTPScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleDigit = (text: string, idx: number) => {
    const digit = text.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp });
      navigation.navigate("RegisterStep2", {
        phone,
        otpToken: res.data.otpToken,
      });
    } catch (err: any) {
      setError(err.message ?? "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/request-otp", { phone });
      setCountdown(60);
      setDigits(Array(OTP_LENGTH).fill(""));
      setError("");
      inputs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message ?? "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Verify phone</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{"\n"}
          <Text style={styles.phone}>{phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {digits.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(el) => { inputs.current[idx] = el; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(t) => handleDigit(t, idx)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, idx)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              caretHidden
            />
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.btnText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>
              Resend in{" "}
              <Text style={styles.countdownNum}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={styles.resendText}>
                {resending ? "Sending…" : "Resend code"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.offWhite },
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 60,
  },
  backBtn: { marginBottom: spacing.xl },
  backText: { color: colors.blue, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink },
  subtitle: {
    fontSize: 15,
    color: colors.gray600,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  phone: { color: colors.ink, fontWeight: "700" },
  otpRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: colors.white,
  },
  otpBoxFilled: {
    borderColor: colors.blue,
    backgroundColor: colors.blueLight,
  },
  error: {
    color: "#DC2626",
    fontSize: 13,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  resendRow: { alignItems: "center", marginTop: spacing.lg },
  countdownText: { color: colors.gray400, fontSize: 14 },
  countdownNum: { fontWeight: "700", color: colors.gray600 },
  resendText: { color: colors.blue, fontWeight: "700", fontSize: 14 },
});
