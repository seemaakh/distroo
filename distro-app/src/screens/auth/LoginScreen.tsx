import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as TextInputType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, radius, typography, shadow } from "../../lib/theme";
import { AuthStackParamList } from "../../navigation/AuthStack";

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, "Login">;
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoComplete,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoComplete?: any;
  maxLength?: number;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  inputRef?: React.Ref<TextInputType>;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderColor = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value === 1 ? colors.blue : colors.gray200,
    borderWidth: borderColor.value === 1 ? 2 : 1.5,
  }));

  const handleFocus = () => {
    setFocused(true);
    borderColor.value = withTiming(1, { duration: 150 });
  };
  const handleBlur = () => {
    setFocused(false);
    borderColor.value = withTiming(0, { duration: 150 });
  };

  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <Animated.View style={[inputStyles.container, borderStyle]}>
        <TextInput
          ref={inputRef}
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray300}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          autoComplete={autoComplete}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={inputStyles.eyeBtn}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: typography.bodySemiBold,
    color: colors.gray600,
    letterSpacing: 0.1,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.gray50,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    fontFamily: typography.body,
  },
  eyeBtn: { paddingRight: spacing.md, paddingLeft: spacing.sm },
});

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const passwordRef = useRef<TextInputType>(null);

  const btnScale = useSharedValue(1);
  const errorShake = useSharedValue(0);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError("Enter your phone number and password.");
      errorShake.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
      return;
    }
    setError("");
    setLoading(true);
    btnScale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    try {
      const res = await api.post("/auth/login", { phone, password });
      const user = res.data.user ?? res.data.profile;
      await setAuth(res.data.token, user);
      btnScale.value = withSpring(1);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Login failed. Try again.";
      setError(msg);
      btnScale.value = withSpring(1);
      errorShake.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.logoText}>DISTRO</Text>
          <Text style={styles.tagline}>Wholesale, made simple.</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, shadow.md]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>
          </View>

          <InputField
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="98XXXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => (passwordRef.current as any)?.focus()}
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            inputRef={passwordRef}
          />

          {!!error && (
            <Animated.View style={[styles.errorWrap, errorStyle]}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          <Animated.View style={btnStyle}>
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnLoading]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, { opacity: 0.6 }]} />
                  <View style={[styles.loadingDot, { opacity: 0.3 }]} />
                </View>
              ) : (
                <Text style={styles.btnText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Register link */}
        <TouchableOpacity
          style={styles.registerRow}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerText}>New to DISTRO? </Text>
          <Text style={styles.registerLink}>Register your store</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.offWhite },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  brand: { alignItems: "center", gap: spacing.xs },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
  },
  logoText: {
    fontSize: 28,
    fontFamily: typography.heading,
    color: colors.ink,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: colors.gray400,
    fontFamily: typography.body,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { gap: 4, marginBottom: spacing.xs },
  cardTitle: {
    fontSize: 22,
    fontFamily: typography.heading,
    color: colors.ink,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.gray400,
    fontFamily: typography.body,
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.redLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
    fontFamily: typography.bodyMedium,
    flex: 1,
  },
  btn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  btnLoading: { opacity: 0.8 },
  btnText: {
    color: colors.white,
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    height: 22,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.white,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  registerText: { fontSize: 14, color: colors.gray500, fontFamily: typography.body },
  registerLink: { fontSize: 14, color: colors.blue, fontFamily: typography.bodySemiBold },
});
