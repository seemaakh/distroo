import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  Image,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeInDown,
  FadeInRight,
  LinearTransition,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../lib/api";
import { Skeleton, ProductCardSkeleton, AnnouncementSkeleton } from "../../components/Skeleton";
import { colors, spacing, radius, shadow, typography } from "../../lib/theme";

const { width: W } = Dimensions.get("window");

interface Announcement {
  id: number;
  title: string;
  body: string;
  color?: string;
}
interface Category {
  id: number;
  name: string;
  productCount?: number;
}
interface Product {
  id: number;
  name: string;
  price: number;
  mrp?: number;
  unit: string;
  stock: number;
  moq?: number;
  image?: string;
  brandName?: string;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  default: "cube-outline",
  Beverage: "wine-outline",
  Snacks: "fast-food-outline",
  Dairy: "water-outline",
  Grain: "leaf-outline",
  Household: "home-outline",
  Personal: "person-outline",
  Cleaning: "sparkles-outline",
};

const CATEGORY_COLORS = [
  { bg: colors.bluePale, icon: colors.blue },
  { bg: "#EDE9FE", icon: "#7C3AED" },
  { bg: colors.greenLight, icon: colors.green },
  { bg: colors.amberLight, icon: colors.amber },
  { bg: "#FCE7F3", icon: "#DB2777" },
  { bg: "#ECFDF5", icon: "#059669" },
  { bg: "#FEF9C3", icon: "#CA8A04" },
  { bg: "#F0F9FF", icon: "#0284C7" },
];

// ─── Animated product card ────────────────────────────────────────────────────
function ProductCard({ item, index, onPress }: { item: Product; index: number; onPress: () => void }) {
  const discount = item.mrp && item.mrp > item.price
    ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
    : 0;
  const outOfStock = item.stock <= 0;

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify().damping(18)}>
      <TouchableOpacity
        style={[styles.productCard, shadow.card]}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* Image placeholder */}
        <View style={styles.productImg}>
          {discount > 0 && !outOfStock && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}%</Text>
            </View>
          )}
          {outOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of stock</Text>
            </View>
          )}
        </View>

        <View style={styles.productBody}>
          {item.brandName && (
            <Text style={styles.brandPill} numberOfLines={1}>{item.brandName}</Text>
          )}
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, outOfStock && { color: colors.gray400 }]}>
              Rs {item.price.toLocaleString()}
            </Text>
            {item.mrp && item.mrp > item.price && (
              <Text style={styles.mrp}>Rs {item.mrp.toLocaleString()}</Text>
            )}
          </View>

          {/* MOQ — always visible if > 1 */}
          {(item.moq ?? 1) > 1 && (
            <View style={styles.moqTag}>
              <Text style={styles.moqText}>MOQ {item.moq} {item.unit}s</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────
function CategoryCard({
  cat,
  index,
  onPress,
}: {
  cat: Category;
  index: number;
  onPress: () => void;
}) {
  const palette = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  const iconName = CATEGORY_ICONS[cat.name] ?? CATEGORY_ICONS.default;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(18)}>
      <TouchableOpacity
        style={[styles.catCard, shadow.sm, { backgroundColor: palette.bg }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[styles.catIconWrap, { backgroundColor: palette.icon + "20" }]}>
          <Ionicons name={iconName} size={20} color={palette.icon} />
        </View>
        <Text style={[styles.catName, { color: palette.icon === colors.blue ? colors.ink80 : palette.icon }]} numberOfLines={2}>
          {cat.name}
        </Text>
        {cat.productCount != null && (
          <Text style={styles.catCount}>{cat.productCount}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────
const ANN_GRADIENTS = [
  { from: colors.blue, to: colors.blueDarker },
  { from: "#7C3AED", to: "#5B21B6" },
  { from: colors.green, to: colors.greenDark },
];

function AnnouncementCard({ item, index }: { item: Announcement; index: number }) {
  const grad = ANN_GRADIENTS[index % ANN_GRADIENTS.length];
  return (
    <View style={[styles.annCard, { backgroundColor: item.color ?? grad.from }]}>
      <Text style={styles.annTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.annBody} numberOfLines={2}>{item.body}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: any) {
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-10);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const load = useCallback(async () => {
    try {
      const [annRes, catRes, prodRes] = await Promise.allSettled([
        api.get("/announcements"),
        api.get("/categories"),
        api.get("/products", { params: { sort: "newest", limit: 12 } }),
      ]);
      if (annRes.status === "fulfilled")
        setAnnouncements(annRes.value.data.announcements ?? annRes.value.data ?? []);
      if (catRes.status === "fulfilled")
        setCategories(catRes.value.data.categories ?? catRes.value.data ?? []);
      if (prodRes.status === "fulfilled")
        setFeatured(prodRes.value.data.products ?? prodRes.value.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
      // Animate header in
      headerOpacity.value = withTiming(1, { duration: 400 });
      headerTranslate.value = withSpring(0, { damping: 20, stiffness: 200 });
    }
  }, []);

  useEffect(() => { load(); }, []);

  const firstName = profile?.name?.split(" ")[0] ?? "there";

  return (
    <ScrollView
      style={styles.bg}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.blue}
          colors={[colors.blue]}
        />
      }
    >
      {/* Safe area top pad */}
      <View style={{ height: insets.top }} />

      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>
            Good {getTimeOfDay()},{" "}
            <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
          {profile?.storeName && (
            <View style={styles.storeRow}>
              <Ionicons name="storefront-outline" size={12} color={colors.gray400} />
              <Text style={styles.storeName}>{profile.storeName}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate("Account")}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Search bar */}
      <TouchableOpacity
        style={[styles.searchBar, shadow.sm]}
        onPress={() => navigation.navigate("Catalogue", { screen: "CatalogueList" })}
        activeOpacity={0.92}
      >
        <Ionicons name="search-outline" size={18} color={colors.gray400} />
        <Text style={styles.searchPlaceholder}>Search products, brands…</Text>
        <View style={styles.searchKbd}>
          <Ionicons name="filter-outline" size={14} color={colors.blue} />
        </View>
      </TouchableOpacity>

      {/* Announcements */}
      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingLeft: spacing.lg, gap: spacing.sm, paddingRight: spacing.lg }}>
          {[1, 2].map((k) => <AnnouncementSkeleton key={k} />)}
        </ScrollView>
      ) : announcements.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingLeft: spacing.lg, gap: spacing.sm, paddingRight: spacing.lg }}>
          {announcements.map((a, i) => <AnnouncementCard key={a.id} item={a} index={i} />)}
        </ScrollView>
      ) : null}

      {/* Categories */}
      <SectionHeader title="Browse by category" />
      {loading ? (
        <View style={styles.catGrid}>
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} width={(W - spacing.lg * 2 - spacing.sm * 3) / 4} height={80} borderRadius={radius.lg} />
          ))}
        </View>
      ) : (
        <View style={styles.catGrid}>
          {categories.slice(0, 8).map((cat, i) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              index={i}
              onPress={() =>
                navigation.navigate("Catalogue", {
                  screen: "CatalogueList",
                  params: { categoryId: cat.id, categoryName: cat.name },
                })
              }
            />
          ))}
        </View>
      )}

      {/* Featured */}
      <SectionHeader
        title="New arrivals"
        action="See all"
        onAction={() => navigation.navigate("Catalogue", { screen: "CatalogueList" })}
      />
      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: spacing.lg, gap: spacing.sm, paddingRight: spacing.lg }}>
          {[1, 2, 3].map((k) => <ProductCardSkeleton key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={featured}
          horizontal
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item, index }) => (
            <ProductCard
              item={item}
              index={index}
              onPress={() =>
                navigation.navigate("Catalogue", {
                  screen: "Product",
                  params: { productId: item.id },
                })
              }
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: spacing.lg, gap: spacing.sm, paddingRight: spacing.lg }}
          scrollEnabled
        />
      )}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.offWhite },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greetingBlock: { gap: 3 },
  greeting: {
    fontSize: 18,
    color: colors.gray500,
    fontFamily: typography.body,
  },
  greetingName: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  storeName: { fontSize: 12, color: colors.gray400, fontFamily: typography.body },

  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 17,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.gray300,
    fontFamily: typography.body,
  },
  searchKbd: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },

  hScroll: { marginBottom: spacing.sm },

  annCard: {
    width: 270,
    borderRadius: radius.xl,
    padding: spacing.lg,
    minHeight: 96,
    justifyContent: "flex-end",
  },
  annTitle: {
    color: colors.white,
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    marginBottom: 3,
  },
  annBody: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: typography.body,
    lineHeight: 18,
  },

  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  catCard: {
    width: (W - spacing.lg * 2 - spacing.sm * 3) / 4,
    borderRadius: radius.lg,
    padding: 10,
    alignItems: "center",
    gap: 5,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: {
    fontSize: 10,
    fontFamily: typography.bodySemiBold,
    textAlign: "center",
    lineHeight: 13,
  },
  catCount: {
    fontSize: 9,
    color: colors.gray400,
    fontFamily: typography.body,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: typography.heading,
    color: colors.ink,
  },
  sectionAction: {
    fontSize: 13,
    color: colors.blue,
    fontFamily: typography.bodySemiBold,
  },

  productCard: {
    width: 152,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  productImg: {
    width: "100%",
    height: 120,
    backgroundColor: colors.gray100,
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: typography.bodySemiBold,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: typography.bodySemiBold,
  },
  productBody: { padding: 10, gap: 4 },
  brandPill: {
    fontSize: 10,
    color: colors.blue,
    fontFamily: typography.bodySemiBold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  productName: {
    fontSize: 13,
    fontFamily: typography.bodySemiBold,
    color: colors.ink,
    lineHeight: 18,
    minHeight: 36,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  price: {
    fontSize: 15,
    fontFamily: typography.heading,
    color: colors.blue,
  },
  mrp: {
    fontSize: 11,
    color: colors.gray300,
    textDecorationLine: "line-through",
    fontFamily: typography.body,
  },
  moqTag: {
    backgroundColor: colors.amberLight,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  moqText: {
    fontSize: 10,
    color: colors.amberDark,
    fontFamily: typography.bodySemiBold,
  },
});
