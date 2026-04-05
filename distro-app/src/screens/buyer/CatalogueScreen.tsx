import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import { useCartStore } from "../../store/cartStore";
import { ProductCardSkeleton } from "../../components/Skeleton";
import { colors, spacing, radius, shadow } from "../../lib/theme";

interface Product {
  id: number;
  name: string;
  price: number;
  mrp?: number;
  unit: string;
  stock: number;
  brandName?: string;
  categoryId?: number;
}
interface Category {
  id: number;
  name: string;
}

export function CatalogueScreen({ navigation, route }: any) {
  const initCategoryId: number | undefined = route?.params?.categoryId;
  const initCategoryName: string | undefined = route?.params?.categoryName;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | undefined>(initCategoryId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addItem, items: cartItems } = useCartStore();

  // 300ms debounce
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  // Load categories once
  useEffect(() => {
    api.get("/categories")
      .then((r) => setCategories(r.data.categories ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async (p = 1, q = "", catId?: number) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string, any> = { page: p, limit: 20 };
      if (q) params.search = q;
      if (catId) params.categoryId = catId;
      const res = await api.get("/products", { params });
      const list: Product[] = res.data.products ?? res.data ?? [];
      setProducts((prev) => (p === 1 ? list : [...prev, ...list]));
      setHasMore(list.length === 20);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    loadProducts(1, debouncedSearch, selectedCat);
  }, [debouncedSearch, selectedCat]);

  const cartQty = (id: number) => cartItems.find((i) => i.productId === id)?.qty ?? 0;

  const renderProduct = ({ item }: { item: Product }) => {
    const qty = cartQty(item.id);
    const outOfStock = item.stock <= 0;
    return (
      <TouchableOpacity
        style={[styles.card, shadow.sm]}
        onPress={() => navigation.navigate("Product", { productId: item.id })}
        activeOpacity={0.88}
      >
        <View style={styles.cardImg} />
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.brandName && (
          <Text style={styles.brandPill}>{item.brandName}</Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>Rs {item.price.toLocaleString()}</Text>
          {item.mrp && item.mrp > item.price && (
            <Text style={styles.mrp}>Rs {item.mrp.toLocaleString()}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.addBtn,
            qty > 0 && styles.addBtnActive,
            outOfStock && styles.addBtnDisabled,
          ]}
          onPress={() => {
            if (!outOfStock)
              addItem({ productId: item.id, name: item.name, price: item.price, unit: item.unit });
          }}
          disabled={outOfStock}
        >
          <Text
            style={[
              styles.addBtnText,
              qty > 0 && styles.addBtnTextActive,
              outOfStock && styles.addBtnTextDisabled,
            ]}
          >
            {outOfStock ? "Out of stock" : qty > 0 ? `In cart (${qty})` : "+ Add"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products…"
          placeholderTextColor={colors.gray400}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCat && styles.chipActive]}
          onPress={() => setSelectedCat(undefined)}
        >
          <Text style={[styles.chipText, !selectedCat && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedCat === cat.id && styles.chipActive]}
            onPress={() => setSelectedCat(selectedCat === cat.id ? undefined : cat.id)}
          >
            <Text
              style={[styles.chipText, selectedCat === cat.id && styles.chipTextActive]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((k) => <ProductCardSkeleton key={k} />)}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={renderProduct}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setPage(1);
                loadProducts(1, debouncedSearch, selectedCat);
              }}
              tintColor={colors.blue}
            />
          }
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              const next = page + 1;
              setPage(next);
              loadProducts(next, debouncedSearch, selectedCat);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.blue} style={{ margin: 16 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg + spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  chipScroll: { maxHeight: 44, backgroundColor: colors.white },
  chipContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 13, color: colors.gray600, fontWeight: "600" },
  chipTextActive: { color: colors.white },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    gap: spacing.sm,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  row: { justifyContent: "space-between", marginBottom: spacing.sm },
  card: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 4,
  },
  cardImg: {
    width: "100%",
    height: 110,
    backgroundColor: colors.gray200,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  cardName: { fontSize: 12, fontWeight: "600", color: colors.ink, minHeight: 32 },
  brandPill: {
    fontSize: 10,
    color: colors.blue,
    backgroundColor: colors.blueLight,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  price: { fontSize: 14, fontWeight: "700", color: colors.blue },
  mrp: { fontSize: 11, color: colors.gray400, textDecorationLine: "line-through" },
  addBtn: {
    backgroundColor: colors.blueLight,
    borderRadius: radius.full,
    paddingVertical: 5,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnActive: { backgroundColor: colors.green },
  addBtnDisabled: { backgroundColor: colors.gray200 },
  addBtnText: { fontSize: 11, fontWeight: "700", color: colors.blue },
  addBtnTextActive: { color: colors.white },
  addBtnTextDisabled: { color: colors.gray400 },
  emptyWrap: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyText: { color: colors.gray400 },
});
