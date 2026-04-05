import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { colors, spacing, radius, typography, shadow } from "../../lib/theme";

const { width: W } = Dimensions.get("window");

// ─── Slide illustrations ─────────────────────────────────────────────────────

function IllustrationStock() {
  // 3×2 grid of "product tiles" + a floating cart
  const tiles = [
    { x: 0, y: 0, color: colors.bluePale, accent: colors.blue },
    { x: 1, y: 0, color: "#EDE9FE", accent: "#7C3AED" },
    { x: 2, y: 0, color: colors.greenLight, accent: colors.green },
    { x: 0, y: 1, color: "#FEF3C7", accent: colors.amber },
    { x: 1, y: 1, color: "#FCE7F3", accent: "#DB2777" },
    { x: 2, y: 1, color: colors.bluePale, accent: colors.blue },
  ];
  return (
    <View style={illus.wrap}>
      <View style={illus.grid}>
        {tiles.map((t, i) => (
          <View key={i} style={[illus.tile, { backgroundColor: t.color }]}>
            <View style={[illus.tileBar, { backgroundColor: t.accent }]} />
            <View style={[illus.tileLine, { backgroundColor: t.accent, opacity: 0.3 }]} />
            <View style={[illus.tileLine2, { backgroundColor: t.accent, opacity: 0.2 }]} />
          </View>
        ))}
      </View>
      {/* Floating cart badge */}
      <View style={illus.cartBadge}>
        <View style={illus.cartIcon}>
          <View style={illus.cartBody} />
          <View style={illus.cartWheel1} />
          <View style={illus.cartWheel2} />
        </View>
        <Text style={illus.cartText}>12 items</Text>
      </View>
    </View>
  );
}

function IllustrationTrack() {
  const steps = [
    { label: "Placed", color: colors.blue, done: true },
    { label: "Confirmed", color: colors.blue, done: true },
    { label: "Packed", color: colors.blue, done: true },
    { label: "In transit", color: colors.amber, done: false },
    { label: "Delivered", color: colors.gray200, done: false },
  ];
  return (
    <View style={illus.wrap}>
      <View style={illus.timelineWrap}>
        {steps.map((s, i) => (
          <View key={i} style={illus.timelineStep}>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <View style={[illus.timelineLine, { backgroundColor: s.done ? colors.blue : colors.gray200 }]} />
            )}
            {/* Dot */}
            <View style={[illus.timelineDot, {
              backgroundColor: s.done ? s.color : colors.gray200,
              borderWidth: s.done ? 0 : 2,
              borderColor: colors.gray300,
              width: i === 3 ? 20 : 16,
              height: i === 3 ? 20 : 16,
              borderRadius: i === 3 ? 10 : 8,
            }]}>
              {s.done && <View style={illus.timelineCheck} />}
            </View>
            {/* Label */}
            <Text style={[illus.timelineLabel, { color: s.done ? colors.ink : colors.gray400, fontFamily: i === 3 ? typography.bodySemiBold : typography.body }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
      {/* Animated position card */}
      <View style={[illus.posCard, shadow.md]}>
        <View style={illus.posCardDot} />
        <View>
          <Text style={illus.posCardTitle}>Your order is on the way</Text>
          <Text style={illus.posCardSub}>Est. delivery: Tomorrow, 2–5 PM</Text>
        </View>
      </View>
    </View>
  );
}

function IllustrationNepal() {
  // Abstract dots representing coverage + network lines
  const cities = [
    { top: "20%", left: "48%", size: 14, primary: true },   // Kathmandu
    { top: "32%", left: "62%", size: 10, primary: false },   // Biratnagar
    { top: "38%", left: "28%", size: 10, primary: false },   // Pokhara
    { top: "55%", left: "52%", size: 10, primary: false },   // Janakpur
    { top: "48%", left: "72%", size: 8, primary: false },    // East
    { top: "25%", left: "18%", size: 8, primary: false },    // West
    { top: "60%", left: "32%", size: 8, primary: false },    // South-west
    { top: "62%", left: "65%", size: 8, primary: false },    // South-east
  ];

  const payments = [
    { name: "eSewa", color: "#00AA60", textColor: "#fff" },
    { name: "Khalti", color: "#5C2D91", textColor: "#fff" },
    { name: "COD", color: colors.ink80, textColor: "#fff" },
  ];

  return (
    <View style={illus.wrap}>
      {/* Coverage map */}
      <View style={illus.mapArea}>
        {/* Connection lines */}
        <View style={[illus.mapLine, { top: "24%", left: "22%", width: "28%", transform: [{ rotate: "15deg" }] }]} />
        <View style={[illus.mapLine, { top: "28%", left: "50%", width: "14%", transform: [{ rotate: "25deg" }] }]} />
        <View style={[illus.mapLine, { top: "38%", left: "52%", width: "20%", transform: [{ rotate: "30deg" }] }]} />
        <View style={[illus.mapLine, { top: "44%", left: "48%", width: "14%", transform: [{ rotate: "-15deg" }] }]} />
        {/* City dots */}
        {cities.map((c, i) => (
          <View
            key={i}
            style={[
              illus.mapDot,
              {
                top: c.top,
                left: c.left,
                width: c.size,
                height: c.size,
                borderRadius: c.size / 2,
                backgroundColor: c.primary ? colors.blue : colors.blueLight,
                borderWidth: c.primary ? 2 : 0,
                borderColor: colors.white,
                marginLeft: -(c.size / 2),
                marginTop: -(c.size / 2),
              },
            ]}
          />
        ))}
        {/* Pulse ring on Kathmandu */}
        <View style={illus.mapPulse} />
        {/* Coverage label */}
        <View style={illus.mapBadge}>
          <Text style={illus.mapBadgeText}>75 districts</Text>
        </View>
      </View>

      {/* Payment pills */}
      <View style={illus.payRow}>
        {payments.map((p) => (
          <View key={p.name} style={[illus.payPill, { backgroundColor: p.color }]}>
            <Text style={[illus.payPillText, { color: p.textColor }]}>{p.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const illus = StyleSheet.create({
  wrap: { width: W * 0.72, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  // Stock
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: 210, justifyContent: "center" },
  tile: {
    width: 62,
    height: 72,
    borderRadius: radius.md,
    padding: 8,
    gap: 6,
    justifyContent: "flex-start",
  },
  tileBar: { width: "70%", height: 8, borderRadius: 4 },
  tileLine: { width: "90%", height: 5, borderRadius: 4 },
  tileLine2: { width: "60%", height: 5, borderRadius: 4 },
  cartBadge: {
    position: "absolute",
    bottom: 24,
    right: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...shadow.md,
  },
  cartIcon: { width: 20, height: 18, justifyContent: "flex-end" },
  cartBody: { width: 18, height: 12, borderRadius: 3, borderWidth: 2, borderColor: colors.blue },
  cartWheel1: { position: "absolute", bottom: 0, left: 2, width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.blue },
  cartWheel2: { position: "absolute", bottom: 0, right: 2, width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.blue },
  cartText: { fontSize: 12, fontFamily: typography.bodySemiBold, color: colors.ink },
  // Track
  timelineWrap: { gap: 0, width: 220 },
  timelineStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 7,
    top: "50%",
    width: 2,
    height: "100%",
    zIndex: -1,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timelineCheck: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  timelineLabel: { fontSize: 13, color: colors.ink },
  posCard: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  posCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.amber,
    flexShrink: 0,
  },
  posCardTitle: { fontSize: 12, fontFamily: typography.bodySemiBold, color: colors.ink },
  posCardSub: { fontSize: 11, color: colors.gray400, marginTop: 1 },
  // Nepal
  mapArea: { width: 200, height: 140, position: "relative", marginBottom: 8 },
  mapLine: {
    position: "absolute",
    height: 1.5,
    backgroundColor: colors.bluePale,
    borderRadius: 1,
  },
  mapDot: { position: "absolute" },
  mapPulse: {
    position: "absolute",
    top: "20%",
    left: "48%",
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.blue,
    opacity: 0.3,
  },
  mapBadge: {
    position: "absolute",
    top: -8,
    right: 0,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  mapBadgeText: { fontSize: 11, color: colors.blue, fontFamily: typography.bodySemiBold },
  payRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  payPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  payPillText: { fontSize: 13, fontFamily: typography.bodySemiBold },
});

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "stock",
    headline: "Stock up\nfaster.",
    body: "Browse thousands of wholesale products and place bulk orders in seconds — right from your phone.",
    Illustration: IllustrationStock,
    accentColor: colors.blue,
  },
  {
    id: "track",
    headline: "See every\nstep.",
    body: "From placement to delivery, live order status keeps you informed so you can run your store confidently.",
    Illustration: IllustrationTrack,
    accentColor: colors.amber,
  },
  {
    id: "nepal",
    headline: "Built for\nNepal.",
    body: "Nationwide delivery across all 75 districts. Pay with eSewa, Khalti, or cash on delivery.",
    Illustration: IllustrationNepal,
    accentColor: colors.green,
  },
];

// ─── Progress dots ────────────────────────────────────────────────────────────
function Dots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <DotItem key={i} active={i === activeIndex} color={SLIDES[activeIndex].accentColor} />
      ))}
    </View>
  );
}

function DotItem({ active, color }: { active: boolean; color: string }) {
  const width = useSharedValue(active ? 24 : 8);
  const opacity = useSharedValue(active ? 1 : 0.35);

  width.value = withSpring(active ? 24 : 8, { damping: 18, stiffness: 200 });
  opacity.value = withTiming(active ? 1 : 0.35, { duration: 200 });

  const style = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
    backgroundColor: active ? color : colors.gray300,
  }));

  return <Animated.View style={[dotStyles.dot, style]} />;
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
});

// ─── Main onboarding screen ───────────────────────────────────────────────────
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<typeof SLIDES[number]>);

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
  });
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollX.value = e.contentOffset.x; },
  });

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      onDone();
    }
  };

  const renderSlide = useCallback(({ item, index }: { item: typeof SLIDES[number]; index: number }) => {
    const { Illustration, headline, body, accentColor } = item;
    return (
      <View style={[slideStyles.slide, { width: W }]}>
        {/* Illustration area */}
        <View style={slideStyles.illustrationArea}>
          <Illustration />
        </View>

        {/* Text */}
        <View style={slideStyles.textArea}>
          <Text style={slideStyles.headline}>{headline}</Text>
          <Text style={slideStyles.body}>{body}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip */}
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={onDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <AnimatedFlatList
        ref={flatListRef as any}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfig.current}
        renderItem={renderSlide as any}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Dots count={SLIDES.length} activeIndex={activeIndex} />

        {/* Next / Get started */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: SLIDES[activeIndex].accentColor }]}
          onPress={goNext}
          activeOpacity={0.88}
        >
          <Text style={styles.nextBtnText}>
            {activeIndex === SLIDES.length - 1 ? "Get started" : "Next"}
          </Text>
          <Text style={styles.nextBtnArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  illustrationArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.lg,
  },
  textArea: {
    width: "100%",
    paddingBottom: spacing.md,
  },
  headline: {
    fontSize: 42,
    lineHeight: 48,
    color: colors.ink,
    fontFamily: typography.heading,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.gray500,
    fontFamily: typography.body,
    maxWidth: 340,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  skipRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: "flex-end",
  },
  skipText: {
    fontSize: 15,
    color: colors.gray400,
    fontFamily: typography.bodyMedium,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  nextBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: typography.bodySemiBold,
  },
  nextBtnArrow: {
    color: colors.white,
    fontSize: 16,
  },
});
