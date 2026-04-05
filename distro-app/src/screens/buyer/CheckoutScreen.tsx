import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useCartStore } from "../../store/cartStore";
import { api } from "../../lib/api";
import { DISTRICTS } from "../../lib/districts";
import { colors, spacing, radius, shadow } from "../../lib/theme";

const PAYMENT_METHODS = [
  { key: "ESEWA", label: "eSewa" },
  { key: "KHALTI", label: "Khalti" },
  { key: "COD", label: "Cash on Delivery" },
];

// Nepal centroid
const NEPAL_REGION: Region = {
  latitude: 27.7,
  longitude: 84.0,
  latitudeDelta: 4.0,
  longitudeDelta: 4.0,
};

export function CheckoutScreen({ navigation }: any) {
  const { items, totalAmount, clearCart } = useCartStore();
  const [district, setDistrict] = useState<string>("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationPermission, setLocationPermission] = useState(false);
  const [locating, setLocating] = useState(false);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(NEPAL_REGION);
  const mapRef = useRef<MapView>(null);

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
    })();
  }, []);

  const handleUseMyLocation = async () => {
    if (!locationPermission) {
      Alert.alert("Permission denied", "Enable location in your device settings.");
      return;
    }
    setLocating(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setMarker({ latitude, longitude });
      const region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setMapRegion(region);
      mapRef.current?.animateToRegion(region, 600);
    } catch {
      Alert.alert("Error", "Could not get your location. Try again.");
    } finally {
      setLocating(false);
    }
  };

  const handleSelectDistrict = (d: typeof DISTRICTS[number]) => {
    setDistrict(d.name);
    setDeliveryFee(d.deliveryFee);
    setShowDistrictPicker(false);
  };

  const total = totalAmount() + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!district) { setError("Please select a delivery district."); return; }
    if (!address.trim()) { setError("Please enter your delivery address."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/orders", {
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        paymentMethod,
        district,
        address,
        deliveryFee,
        deliveryLat: marker?.latitude ?? null,
        deliveryLng: marker?.longitude ?? null,
      });
      clearCart();
      const orderId = res.data.order?.id ?? res.data.id;
      const orderNumber = res.data.order?.orderNumber ?? res.data.orderNumber ?? `ORD-${orderId}`;
      navigation.replace("OrderConfirm", { orderId, orderNumber });
    } catch (err: any) {
      setError(err.message ?? "Order failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>Checkout</Text>

      {/* District */}
      <View style={[styles.section, shadow.sm]}>
        <Text style={styles.sectionTitle}>Delivery district</Text>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setShowDistrictPicker(!showDistrictPicker)}
        >
          <Text style={district ? styles.pickerVal : styles.pickerPlaceholder}>
            {district ? `${district}  —  Rs ${deliveryFee} delivery` : "Select district"}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        {showDistrictPicker && (
          <View style={styles.dropdown}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {DISTRICTS.map((d) => (
                <TouchableOpacity
                  key={d.name}
                  style={[styles.dropItem, district === d.name && styles.dropItemActive]}
                  onPress={() => handleSelectDistrict(d)}
                >
                  <Text style={[styles.dropText, district === d.name && styles.dropTextActive]}>
                    {d.name}
                  </Text>
                  <Text style={styles.dropFee}>Rs {d.deliveryFee}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Address */}
      <View style={[styles.section, shadow.sm]}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        <TextInput
          style={styles.addressInput}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, ward, landmark…"
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Map */}
      <View style={[styles.section, shadow.sm]}>
        <Text style={styles.sectionTitle}>Pin your store location</Text>
        <Text style={styles.mapSubtitle}>Drag the marker to your exact location</Text>
        <TouchableOpacity
          style={[styles.locationBtn, locating && styles.locationBtnDisabled]}
          onPress={handleUseMyLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.blue} />
          ) : (
            <Text style={styles.locationBtnText}>📍 Use My Location</Text>
          )}
        </TouchableOpacity>
        <MapView
          ref={mapRef}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={(r) => setMapRegion(r)}
        >
          {marker && (
            <Marker
              coordinate={marker}
              draggable
              onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)}
              pinColor={colors.blue}
            />
          )}
        </MapView>
        {marker ? (
          <View style={styles.coordsWrap}>
            <Text style={styles.coordsText}>
              Lat: {marker.latitude.toFixed(4)},  Lng: {marker.longitude.toFixed(4)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noPin}>No pin set — tap "Use My Location" or tap the map</Text>
        )}
        {/* tap on map to set pin */}
        {!marker && (
          <TouchableOpacity
            style={styles.tapMapHint}
            onPress={() => {
              // set a default Nepal center pin
              setMarker({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
            }}
          >
            <Text style={styles.tapMapText}>Tap to drop pin at center</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Payment */}
      <View style={[styles.section, shadow.sm]}>
        <Text style={styles.sectionTitle}>Payment method</Text>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.methodRow, paymentMethod === m.key && styles.methodRowActive]}
            onPress={() => setPaymentMethod(m.key)}
          >
            <View style={[styles.radio, paymentMethod === m.key && styles.radioActive]}>
              {paymentMethod === m.key && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.methodLabel, paymentMethod === m.key && styles.methodLabelActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order summary */}
      <View style={[styles.section, shadow.sm]}>
        <Text style={styles.sectionTitle}>Order summary</Text>
        {items.map((item) => (
          <View key={item.productId} style={styles.summaryRow}>
            <Text style={styles.summaryName} numberOfLines={1}>
              {item.name} × {item.qty}
            </Text>
            <Text style={styles.summaryAmt}>Rs {(item.price * item.qty).toLocaleString()}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryAmt}>Rs {totalAmount().toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryAmt}>
            {district ? `Rs ${deliveryFee}` : "—"}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmt}>Rs {total.toLocaleString()}</Text>
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.orderBtn, loading && styles.btnDisabled]}
        onPress={handlePlaceOrder}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.orderBtnText}>Place order — Rs {total.toLocaleString()}</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.lg, paddingTop: 60, gap: spacing.md },
  backBtn: { marginBottom: spacing.xs },
  backText: { color: colors.blue, fontSize: 15, fontWeight: "600" },
  heading: { fontSize: 26, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.offWhite,
  },
  pickerVal: { fontSize: 14, color: colors.ink },
  pickerPlaceholder: { fontSize: 14, color: colors.gray400 },
  chevron: { color: colors.gray400 },
  dropdown: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  dropItemActive: { backgroundColor: colors.blueLight },
  dropText: { fontSize: 13, color: colors.ink },
  dropTextActive: { color: colors.blue, fontWeight: "700" },
  dropFee: { fontSize: 12, color: colors.gray400 },
  addressInput: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.offWhite,
    minHeight: 60,
    textAlignVertical: "top",
  },
  mapSubtitle: { fontSize: 12, color: colors.gray400, marginTop: -spacing.xs },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueLight,
    borderRadius: radius.md,
    paddingVertical: 10,
    gap: spacing.xs,
  },
  locationBtnDisabled: { opacity: 0.6 },
  locationBtnText: { color: colors.blue, fontWeight: "700", fontSize: 14 },
  map: { width: "100%", height: 220, borderRadius: radius.md, overflow: "hidden" },
  coordsWrap: {
    backgroundColor: colors.blueLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: "center",
  },
  coordsText: { fontSize: 13, color: colors.blue, fontWeight: "600" },
  noPin: { fontSize: 12, color: colors.gray400, textAlign: "center" },
  tapMapHint: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  tapMapText: { color: colors.blue, fontSize: 13, fontWeight: "600" },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  methodRowActive: { backgroundColor: colors.blueLight },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray400,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  methodLabel: { fontSize: 14, color: colors.gray600 },
  methodLabelActive: { color: colors.ink, fontWeight: "700" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryName: { flex: 1, fontSize: 13, color: colors.gray600, marginRight: spacing.sm },
  summaryAmt: { fontSize: 13, fontWeight: "600", color: colors.ink },
  summaryLabel: { fontSize: 14, color: colors.gray600 },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: spacing.xs },
  totalLabel: { fontSize: 15, fontWeight: "700", color: colors.ink },
  totalAmt: { fontSize: 18, fontWeight: "700", color: colors.blue },
  error: {
    color: "#DC2626",
    fontSize: 13,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  orderBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  orderBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
