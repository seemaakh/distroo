import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, Image,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { api } from "../../lib/api";
import { colors, spacing, radius, shadow, typography } from "../../lib/theme";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - spacing.lg * 2 - spacing.sm) / 2;

interface Announcement { id: string; text: string; color?: string; }
interface Category { id: string; name: string; }
interface Product {
  id: string; name: string; price: number; mrp?: number;
  unit: string; stockQty: number; moq?: number; imageUrl?: string; brand?: string;
}

// ─── Announcement auto-scroll banner ──────────────────────────────────────────
const ANN_BG = ["#1D4ED8", "#7C3AED", "#059669", "#B45309"];

function AnnouncementBanner({ items }: { items: Announcement[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 3500);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[idx];
  return (
    <View style={ab.wrap}>
      <View style={[ab.card, { backgroundColor: item.color ?? ANN_BG[idx % ANN_BG.length] }]}>
        <Text style={ab.label}>📢 ANNOUNCEMENT</Text>
        <Text style={ab.body} numberOfLines={3}>{item.text}</Text>
      </View>
      {items.length > 1 && (
        <View style={ab.dots}>
          {items.map((_, i) => <View key={i} style={[ab.dot, i === idx && ab.dotActive]} />)}
        </View>
      )}
    </View>
  );
}
const ab = StyleSheet.create({
  wrap:      { gap: 8, marginBottom: spacing.xs },
  card:      { marginHorizontal: spacing.lg, borderRadius: radius.xl, padding: spacing.lg, minHeight: 100, gap: 6 },
  label:     { fontSize: 11, fontFamily: typography.bodySemiBold, color: "rgba(255,255,255,0.65)", letterSpacing: 1.2, textTransform: "uppercase" },
  body:      { fontSize: 15, fontFamily: typography.bodySemiBold, color: "#fff", lineHeight: 22 },
  dots:      { flexDirection: "row", justifyContent: "center", gap: 5 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: colors.white, width: 16, borderRadius: 3 },
});

// ─── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ item, onPress, onAdd }: { item: Product; onPress: () => void; onAdd: () => void }) {
  const outOfStock = item.stockQty <= 0;
  const discount = item.mrp && item.mrp > item.price
    ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
  return (
    <TouchableOpacity style={[pc.card, shadow.card]} onPress={onPress} activeOpacity={0.88}>
      <View style={pc.imgWrap}>
        {item.imageUrl
          ? <Image source={{ uri: item.imageUrl }} style={pc.img} resizeMode="cover" />
          : <View style={pc.imgPlaceholder} />}
        {discount > 0 && !outOfStock && (
          <View style={pc.badge}><Text style={pc.badgeText}>{discount}%</Text></View>
        )}
        {outOfStock && (
          <View style={pc.oosBanner}><Text style={pc.oosText}>Out of stock</Text></View>
        )}
      </View>
      <View style={pc.body}>
        {item.brand && <Text style={pc.brand} numberOfLines={1}>{item.brand}</Text>}
        <Text style={pc.name} numberOfLines={2}>{item.name}</Text>
        <Text style={pc.price}>Rs {item.price.toLocaleString()}</Text>
        <Text style={pc.meta}>/{item.unit}{item.moq && item.moq > 1 ? ` · MOQ ${item.moq}` : ""}</Text>
        {!outOfStock && (
          <TouchableOpacity style={pc.addBtn} onPress={onAdd} activeOpacity={0.8} hitSlop={8}>
            <Ionicons name="add" size={18} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
const IMG_H = Math.round(CARD_W * 0.9);
const pc = StyleSheet.create({
  card: { width: CARD_W, backgroundColor: colors.white, borderRadius: radius.xl, overflow: "hidden" },
  imgWrap: { width: "100%", height: IMG_H, position: "relative" },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { width: "100%", height: "100%", backgroundColor: colors.gray100 },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: colors.green, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: typography.bodySemiBold, color: colors.white },
  oosBanner: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  oosText: { fontSize: 11, fontFamily: typography.bodySemiBold, color: colors.white },
  body: { padding: 10, paddingBottom: 42, gap: 2 },
  brand: { fontSize: 10, fontFamily: typography.bodySemiBold, color: colors.blue, letterSpacing: 0.3, textTransform: "uppercase" },
  name: { fontSize: 13, fontFamily: typography.bodySemiBold, color: colors.ink, lineHeight: 17, minHeight: 34 },
  price: { fontSize: 15, fontFamily: typography.heading, color: colors.blue, marginTop: 2 },
  meta: { fontSize: 11, fontFamily: typography.body, color: colors.gray400 },
  addBtn: { position: "absolute", bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
});

// ─── Card skeleton ─────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <View style={[pc.card, shadow.card]}>
      <View style={{ height: IMG_H, backgroundColor: colors.gray100 }} />
      <View style={{ padding: 10, gap: 6 }}>
        {[40, 90, 70, 50, 30].map((w, i) => (
          <View key={i} style={{ height: i === 2 ? 12 : 8, width: `${w}%`, backgroundColor: colors.gray100, borderRadius: 4 }} />
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: any) {
  const { profile } = useAuthStore();
  const { addItem } = useCartStore();
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    }
  }, []);

  useEffect(() => { load(); }, []);

  const firstName = profile?.name?.split(" ")[0] ?? profile?.storeName ?? "there";
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const goCatalogue = (params?: object) =>
    navigation.navigate("Catalogue", { screen: "CatalogueList", params });

  return (
    <ScrollView
      style={s.bg}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.blue} colors={[colors.blue]}
        />
      }
    >
      <View style={{ height: insets.top, backgroundColor: colors.white }} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.logo}>DISTRO</Text>
          <Text style={s.greeting}>
            {greeting}, <Text style={s.greetingName}>{firstName}</Text> 👋
          </Text>
        </View>
        <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate("Account")} activeOpacity={0.85}>
          <Text style={s.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TouchableOpacity style={[s.search, shadow.sm]} onPress={() => goCatalogue()} activeOpacity={0.92}>
        <Ionicons name="search-outline" size={18} color={colors.gray400} />
        <Text style={s.searchText}>Search products, brands…</Text>
      </TouchableOpacity>

      {/* Announcements */}
      {loading
        ? <View style={s.annSkeleton} />
        : <AnnouncementBanner items={announcements} />}

      {/* Categories */}
      <Text style={s.sectionTitle}>Browse by category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
        {loading
          ? [1, 2, 3, 4].map(k => <View key={k} style={s.pillSkeleton} />)
          : categories.map(cat => (
            <TouchableOpacity
              key={cat.id} style={s.pill} activeOpacity={0.8}
              onPress={() => goCatalogue({ categoryId: cat.id, categoryName: cat.name })}
            >
              <Text style={s.pillText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Products */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>New arrivals</Text>
        <TouchableOpacity onPress={() => goCatalogue()} style={s.seeAllBtn}>
          <Text style={s.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={s.grid}>
        {loading
          ? [1, 2, 3, 4].map(k => <CardSkeleton key={k} />)
          : featured.map(item => (
            <ProductCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate("Catalogue", { screen: "Product", params: { productId: item.id } })}
              onAdd={() => addItem({ productId: item.id, name: item.name, price: item.price, unit: item.unit })}
            />
          ))}
      </View>

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.white },
  logo: { fontSize: 22, fontFamily: typography.heading, color: "#155ac1", letterSpacing: 4 },
  greeting: { fontSize: 13, fontFamily: typography.body, color: colors.gray400, marginTop: 1 },
  greetingName: { fontFamily: typography.bodySemiBold, color: colors.gray600 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontFamily: typography.heading, fontSize: 17 },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md, borderRadius: radius.xl, paddingVertical: 13, paddingHorizontal: spacing.md },
  searchText: { flex: 1, fontSize: 14, color: colors.gray300, fontFamily: typography.body },
  annSkeleton: { height: 100, marginHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.gray100 },
  sectionTitle: { fontSize: 17, fontFamily: typography.heading, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: spacing.lg },
  seeAllBtn: { paddingVertical: spacing.sm },
  seeAll: { fontSize: 13, color: colors.blue, fontFamily: typography.bodySemiBold },
  pills: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  pill: { backgroundColor: colors.white, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: colors.gray200 },
  pillText: { fontSize: 13, fontFamily: typography.bodyMedium, color: colors.ink },
  pillSkeleton: { width: 80, height: 34, borderRadius: radius.full, backgroundColor: colors.gray100 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.sm },
});
