import { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useAuthStore } from "../store/authStore";
import { AuthStack } from "./AuthStack";
import { BuyerTabs } from "./BuyerTabs";
import { AdminTabs } from "./AdminTabs";
import { OnboardingScreen } from "../screens/auth/OnboardingScreen";
import { colors, typography } from "../lib/theme";

// Wrapper so onboarding always re-mounts cleanly
function OnboardingPhase({ onDone }: { onDone: () => void }) {
  return <OnboardingScreen onDone={onDone} />;
}

const ONBOARDING_KEY = "distro_onboarding_done";
const LETTERS = ["D", "I", "S", "T", "R", "O"];

// ─── Letter component ────────────────────────────────────────────────────────
function SplashLetter({ char, index }: { char: string; index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const delay = 80 + index * 90;
    const timer = setTimeout(() => {
      progress.value = withSpring(1, { damping: 14, stiffness: 160, mass: 0.8 });
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [28, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 0.6, 1], [0.8, 1.06, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.Text style={[styles.splashLetter, style]}>{char}</Animated.Text>
  );
}

// ─── Animated underline ──────────────────────────────────────────────────────
function SplashLine({ animate }: { animate: boolean }) {
  const width = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      width.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    }
  }, [animate]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View style={styles.lineTrack}>
      <Animated.View style={[styles.lineBar, style]} />
    </View>
  );
}

// ─── Tagline ─────────────────────────────────────────────────────────────────
function SplashTagline({ animate }: { animate: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      opacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    }
  }, [animate]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text style={[styles.splashTagline, style]}>
      Wholesale, made simple.
    </Animated.Text>
  );
}

// ─── Full splash screen ───────────────────────────────────────────────────────
function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const [lineVisible, setLineVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  // Phase 2: line appears after letters (last letter: delay ~620ms)
  useEffect(() => {
    const lineTimer = setTimeout(() => setLineVisible(true), 700);
    const taglineTimer = setTimeout(() => setTaglineVisible(true), 800);
    const exitTimer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 450, easing: Easing.in(Easing.cubic) });
      containerScale.value = withTiming(1.05, { duration: 450, easing: Easing.in(Easing.cubic) });
      setTimeout(() => runOnJS(onFinish)(), 480);
    }, 1700);

    return () => {
      clearTimeout(lineTimer);
      clearTimeout(taglineTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View style={[styles.splashContainer, containerStyle]}>
      <View style={styles.splashInner}>
        {/* Logo mark — blue dot accent above */}
        <View style={styles.dotAccent} />

        {/* Letters row */}
        <View style={styles.lettersRow}>
          {LETTERS.map((char, i) => (
            <SplashLetter key={char} char={char} index={i} />
          ))}
        </View>

        {/* Underline */}
        <SplashLine animate={lineVisible} />

        {/* Tagline */}
        <SplashTagline animate={taglineVisible} />
      </View>
    </Animated.View>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
type Phase = "loading" | "splash" | "onboarding" | "app";

export function RootNavigator() {
  const { isLoading, token, profile, loadToken } = useAuthStore();
  const [phase, setPhase] = useState<Phase>("loading");
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    (async () => {
      await loadToken();
      const done = await SecureStore.getItemAsync(ONBOARDING_KEY).catch(() => null);
      setOnboardingDone(done === "true");
      await SplashScreen.hideAsync().catch(() => {});
      setPhase("splash");
    })();
  }, []);

  const handleSplashFinish = useCallback(() => {
    if (!onboardingDone) {
      setPhase("onboarding");
    } else {
      setPhase("app");
    }
  }, [onboardingDone]);

  const handleOnboardingDone = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true").catch(() => {});
    setPhase("app");
  }, []);

  if (phase === "loading") return null;

  if (phase === "splash") {
    return <AnimatedSplash onFinish={handleSplashFinish} />;
  }

  if (phase === "onboarding") {
    return <OnboardingPhase onDone={handleOnboardingDone} />;
  }

  // Phase: app
  const getNavigator = () => {
    if (!token) return <AuthStack />;
    if (profile?.role === "ADMIN") return <AdminTabs />;
    return <BuyerTabs />;
  };

  return (
    <NavigationContainer>{getNavigator()}</NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  splashInner: {
    alignItems: "center",
    gap: 12,
  },
  dotAccent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blue,
    marginBottom: 4,
  },
  lettersRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  splashLetter: {
    fontSize: 48,
    color: colors.ink,
    fontFamily: typography.heading,
    letterSpacing: 2,
    lineHeight: 56,
  },
  lineTrack: {
    width: 220,
    height: 2.5,
    backgroundColor: colors.gray100,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  lineBar: {
    height: "100%",
    backgroundColor: colors.blue,
    borderRadius: 2,
  },
  splashTagline: {
    fontSize: 14,
    color: colors.gray400,
    fontFamily: typography.body,
    letterSpacing: 0.3,
    marginTop: 4,
  },
});
