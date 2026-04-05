import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeInDown,
  FadeIn,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useCartStore } from "../../store/cartStore";
import { colors, spacing, radius, shadow, typography } from "../../lib/theme";

const { width: W } = Dimensions.get("window");

interface Product {
  id: number;
  name: string;
  price: number;
  mrp?: number;
  unit: string;
  stock: number;
  moq?: number;
  description?: string;
  categoryName?: string;
  brandName?: string;
}

// ─── Stock badge ──────────────────────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)
    return (
      <View style={[badge.wrap, { backgroundColor: colors.redLight }]}>
        <View style={[badge.dot, { backgroundColor: colors.red }]} />
        <Text style={[badge.text, { color: colors.red }]}>Out of stock</Text>
      </View>
    );
  if (stock <= 10)
    return (
      <View style={[badge.wrap, { backgroundColor: colors.amberLight }]}>
        <View style={[badge.dot, { backgroundColor: colors.amber }]} />
        <Text style={[badge.text, { color: colors.amberDark }]}>Low stock — {stock} left</Text>
      </View>
    );
  return (
    <View style={[badge.wrap, { backgroundColor: colors.greenLight }]}>
      <View style={[badge.dot, { backgroundColor: colors.green }]} />
      <Text style={[badge.text, { color: colors.greenDark }]}>In stock</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontFamily: typography.bodySemiBold },
});

// ─── Quantity stepper ─────────────────────────────────────────────────────────
function QtyButton({ onPress, icon, disabled }: { onPress: () => void; icon: string; disabled: boolean }) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.88, { damping: 18, stiffness: 300 }),
      withSpring(1, { damping: 18, stiffness: 300 })
    );
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} disabled={disabled}>
      <Animated.View style={[qtyStyles.btn, style]}>
        <Text style={qtyStyles.btnIcon}>{icon}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const qtyStyles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIcon: { fontSize: 20, color: colors.blue, lineHeight: 24 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ProductScreen({ navigation, route }: any) {
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const { addItem, items, updateQty } = useCartStore();

  const barY = useSharedValue(80);
  const barOpacity = useSharedValue(0);
  const addBtnScale = useSharedValue(1);
  const feedbackOpacity = useSharedValue(0);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barY.value }],
    opacity: barOpacity.value,
  }));

  const addBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addBtnScale.value }],
  }));

  const feedbackStyle = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
    transform: [{ translateY: interpolate(feedbackOpacity.value, [0, 1], [4, 0], Extrapolation.CLAMP) }],
  }));

  useEffect(() => {
    api.get(`/products/${productId}`)
      .then((res) => {
        const p = res.data.product ?? res.data;
        setProduct(p);
        const moq = p.moq ?? 1;
        setQty(moq);
        // Animate sticky bar in
        barY.value = withSpring(0, { damping: 18, stiffness: 200 });
        barOpacity.value = withTiming(1, { duration: 300 });
      })
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [productId]);

  const cartItem = items.find((i) => i.productId === productId);
  const moq = product?.moq ?? 1;
  const outOfStock = (product?.stock ?? 0) <= 0;

  const discount = product?.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.price) * 100)
    : 0;

  const handleAddToCart = () => {
    if (!product || outOfStock) return;

    addBtnScale.value = withSequence(
      withSpring(0.94, { damping: 18, stiffness: 300 }),
      withSpring(1.03, { damping: 18, stiffness: 300 }),
      withSpring(1, { damping: 18, stiffness: 300 })
    );

    if (cartItem) {
      updateQty(product.id, cartItem.qty + qty);
    } else {
      for (let i = 0; i < qty; i++) {
        addItem({ productId: product.id, name: product.name, price: product.price, unit: product.unit });
      }
    }

    // Feedback flash
    feedbackOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 300 })
    );
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <View style={styles.loadingSpinner} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingCenter}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.gray300} />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.bg}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* Image hero */}
        <View style={styles.heroWrap}>
          <View style={styles.heroImg}>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>−{discount}%</Text>
              </View>
            )}
          </View>

          {/* Back button floating over image */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {/* Content card (white, overlaps image slightly) */}
        <View style={styles.contentCard}>
          {/* Top row: brand + category */}
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.topMeta}>
            {product.brandName && (
              <View style={styles.brandChip}>
                <Text style={styles.brandText}>{product.brandName}</Text>
              </View>
            )}
            {product.categoryName && (
              <Text style={styles.catText}>{product.categoryName}</Text>
            )}
          </Animated.View>

          {/* Product name */}
          <Animated.Text entering={FadeInDown.delay(120).springify()} style={styles.name}>
            {product.name}
          </Animated.Text>

          {/* Price */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.priceRow}>
            <Text style={styles.price}>Rs {product.price.toLocaleString()}</Text>
            <Text style={styles.priceUnit}>/ {product.unit}</Text>
            {product.mrp && product.mrp > product.price && (
              <Text style={styles.mrp}>Rs {product.mrp.toLocaleString()}</Text>
            )}
          </Animated.View>

          {/* Stock */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <StockBadge stock={product.stock} />
          </Animated.View>

          {/* MOQ callout — if applicable */}
          {moq > 1 && (
            <Animated.View entering={FadeInDown.delay(230).springify()} style={styles.moqCallout}>
              <Ionicons name="information-circle-outline" size={16} color={colors.amberDark} />
              <Text style={styles.moqCalloutText}>
                Minimum order quantity: <Text style={styles.moqCalloutBold}>{moq} {product.unit}s</Text>
              </Text>
            </Animated.View>
          )}

          {/* Quantity stepper */}
          <Animated.View entering={FadeInDown.delay(270).springify()} style={styles.qtySection}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <QtyButton
                icon="−"
                disabled={qty <= moq}
                onPress={() => setQty((q) => Math.max(moq, q - 1))}
              />
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyValue}>{qty}</Text>
                <Text style={styles.qtyUnit}>{product.unit}{qty > 1 ? "s" : ""}</Text>
              </View>
              <QtyButton
                icon="+"
                disabled={qty >= product.stock}
                onPress={() => setQty((q) => q + 1)}
              />
            </View>
          </Animated.View>

          {/* Description */}
          {product.description && (
            <Animated.View entering={FadeInDown.delay(310).springify()} style={styles.descCard}>
              <Text style={styles.descLabel}>About this product</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </Animated.View>
          )}

          {/* Cart context */}
          {cartItem && (
            <Animated.View entering={FadeIn} style={styles.cartNote}>
              <Ionicons name="bag-outline" size={14} color={colors.blue} />
              <Text style={styles.cartNoteText}>
                {cartItem.qty} already in cart — adding {qty} more = {cartItem.qty + qty} total
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <Animated.View
        style={[
          styles.stickyBar,
          shadow.lg,
          barStyle,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        {/* Total */}
        <View style={styles.stickyTotal}>
          <Text style={styles.stickyAmount}>Rs {(product.price * qty).toLocaleString()}</Text>
          <Text style={styles.stickyQtyNote}>{qty} {product.unit}{qty > 1 ? "s" : ""}</Text>
        </View>

        {/* Add button */}
        <Animated.View style={[{ flex: 1 }, addBtnStyle]}>
          <TouchableOpacity
            style={[
              styles.addBtn,
              outOfStock && styles.addBtnDisabled,
              !outOfStock && cartItem && styles.addBtnUpdate,
            ]}
            onPress={handleAddToCart}
            disabled={outOfStock}
            activeOpacity={0.9}
          >
            {addedFeedback ? (
              <Animated.View style={[styles.addBtnInner, feedbackStyle]}>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={styles.addBtnText}>Added!</Text>
              </Animated.View>
            ) : (
              <View style={styles.addBtnInner}>
                <Ionicons
                  name={outOfStock ? "close-circle-outline" : cartItem ? "add-circle-outline" : "bag-add-outline"}
                  size={18}
                  color={outOfStock ? colors.gray400 : colors.white}
                />
                <Text style={[styles.addBtnText, outOfStock && { color: colors.gray400 }]}>
                  {outOfStock ? "Out of stock" : cartItem ? "Add more" : "Add to cart"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.white },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.offWhite,
    gap: spacing.sm,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.gray200,
    borderTopColor: colors.blue,
  },
  errorText: { color: colors.gray400, fontFamily: typography.body, fontSize: 14 },

  heroWrap: { position: "relative" },
  heroImg: {
    width: W,
    height: 300,
    backgroundColor: colors.gray100,
  },
  discountBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  discountText: { color: colors.white, fontFamily: typography.bodySemiBold, fontSize: 12 },
  backBtn: {
    position: "absolute",
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },

  contentCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  topMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandChip: {
    backgroundColor: colors.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  brandText: { fontSize: 11, fontFamily: typography.bodySemiBold, color: colors.blue, letterSpacing: 0.4 },
  catText: { fontSize: 12, color: colors.gray400, fontFamily: typography.body },
  name: {
    fontSize: 24,
    fontFamily: typography.heading,
    color: colors.ink,
    lineHeight: 30,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  price: { fontSize: 30, fontFamily: typography.heading, color: colors.blue },
  priceUnit: { fontSize: 14, color: colors.gray400, fontFamily: typography.body },
  mrp: { fontSize: 16, color: colors.gray300, textDecorationLine: "line-through", fontFamily: typography.body },

  moqCallout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.amberLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  moqCalloutText: { flex: 1, fontSize: 13, color: "#78350F", fontFamily: typography.body, lineHeight: 18 },
  moqCalloutBold: { fontFamily: typography.bodySemiBold },

  qtySection: { gap: spacing.sm },
  qtyLabel: { fontSize: 14, fontFamily: typography.bodySemiBold, color: colors.gray600 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  qtyDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    minWidth: 64,
    justifyContent: "center",
  },
  qtyValue: { fontSize: 26, fontFamily: typography.heading, color: colors.ink },
  qtyUnit: { fontSize: 13, color: colors.gray400, fontFamily: typography.body },

  descCard: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  descLabel: { fontSize: 13, fontFamily: typography.bodySemiBold, color: colors.gray600 },
  descText: { fontSize: 14, color: colors.gray500, fontFamily: typography.body, lineHeight: 22 },

  cartNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.blueLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  cartNoteText: { flex: 1, fontSize: 12, color: colors.blue, fontFamily: typography.bodyMedium },

  // Sticky bar
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  stickyTotal: { gap: 1 },
  stickyAmount: { fontSize: 22, fontFamily: typography.heading, color: colors.ink },
  stickyQtyNote: { fontSize: 12, color: colors.gray400, fontFamily: typography.body },
  addBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    flex: 1,
    alignItems: "center",
  },
  addBtnUpdate: { backgroundColor: colors.blueDark },
  addBtnDisabled: { backgroundColor: colors.gray200 },
  addBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
  },
  addBtnText: {
    color: colors.white,
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
  },
});
