import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput as TI } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, radius, typography } from "../../lib/theme";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { AuthBrand, StepIndicator, InputField, AuthError, s } from "./_shared";

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, "RegisterStep2">;
  route: RouteProp<AuthStackParamList, "RegisterStep2">;
};

const NEPAL_DISTRICTS = [
  "Achham", "Arghakhanchi", "Baglung", "Baitadi", "Bajhang", "Bajura",
  "Banke", "Bara", "Bardiya", "Bhaktapur", "Bhojpur", "Chitwan",
  "Dadeldhura", "Dailekh", "Dang", "Darchula", "Dhading", "Dhankuta",
  "Dhanusa", "Dolakha", "Dolpa", "Doti", "Gorkha", "Gulmi", "Humla",
  "Ilam", "Jajarkot", "Jhapa", "Jumla", "Kailali", "Kalikot", "Kanchanpur",
  "Kapilvastu", "Kaski", "Kathmandu", "Kavrepalanchok", "Khotang",
  "Lalitpur", "Lamjung", "Mahottari", "Makwanpur", "Manang", "Morang",
  "Mugu", "Mustang", "Myagdi", "Nawalparasi", "Nuwakot", "Okhaldhunga",
  "Palpa", "Panchthar", "Parbat", "Parsa", "Pyuthan", "Ramechhap",
  "Rasuwa", "Rautahat", "Rolpa", "Rupandehi", "Salyan", "Sankhuwasabha",
  "Saptari", "Sarlahi", "Sindhuli", "Sindhupalchok", "Siraha", "Solukhumbu",
  "Sunsari", "Surkhet", "Syangja", "Tanahun", "Taplejung", "Terhathum",
  "Udayapur",
];

function DistrictPicker({ value, onSelect }: { value: string; onSelect: (d: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>District</Text>
      <TouchableOpacity
        style={[p.trigger, open && p.triggerOpen]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
      >
        <Text style={value ? p.selected : p.placeholder}>{value || "Select your district"}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.gray400} />
      </TouchableOpacity>
      {open && (
        <View style={p.dropdown}>
          <ScrollView style={p.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {NEPAL_DISTRICTS.map(d => (
              <TouchableOpacity
                key={d}
                style={[p.item, value === d && p.itemActive]}
                onPress={() => { onSelect(d); setOpen(false); }}
              >
                <Text style={[p.itemText, value === d && p.itemTextActive]}>{d}</Text>
                {value === d && <Ionicons name="checkmark" size={16} color={colors.blue} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const p = StyleSheet.create({
  trigger:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 15, backgroundColor: colors.gray50 },
  triggerOpen: { borderColor: colors.blue, borderWidth: 2, backgroundColor: colors.white },
  selected:    { fontSize: 16, fontFamily: typography.body, color: colors.ink },
  placeholder: { fontSize: 16, fontFamily: typography.body, color: colors.gray300 },
  dropdown:    { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.lg, overflow: "hidden", marginTop: -4 },
  list:        { maxHeight: 200, backgroundColor: colors.white },
  item:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  itemActive:  { backgroundColor: colors.blueLight },
  itemText:    { fontSize: 15, fontFamily: typography.body, color: colors.ink },
  itemTextActive: { fontFamily: typography.bodySemiBold, color: colors.blue },
});

export function RegisterStep2Screen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { phone, otpToken } = route.params;
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [district, setDistrict] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const ownerRef = useRef<TI>(null);
  const passwordRef = useRef<TI>(null);
  const confirmRef = useRef<TI>(null);

  const btnScale = useSharedValue(1);
  const errorShake = useSharedValue(0);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  const errorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: errorShake.value }] }));

  const shake = () => {
    errorShake.value = withSequence(
      withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }), withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handleRegister = async () => {
    if (!storeName.trim() || !ownerName.trim() || !district || !password) {
      setError("All fields are required."); shake(); return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters."); shake(); return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match."); shake(); return;
    }
    setError("");
    setLoading(true);
    btnScale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    try {
      const res = await api.post("/auth/register", { phone, otpToken, storeName, ownerName, district, password });
      await setAuth(res.data.token, res.data.user);
      btnScale.value = withSpring(1);
    } catch (err: any) {
      setError(err.message ?? "Registration failed.");
      btnScale.value = withSpring(1);
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={ls.backRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={ls.backText}>Back</Text>
        </TouchableOpacity>

        <AuthBrand subtitle="Almost there — just your store details" />

        <View style={s.card}>
          <StepIndicator current={2} total={2} />
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Your store 🏪</Text>
            <Text style={s.cardSubtitle}>Tell us about your business so buyers can find you.</Text>
          </View>
          <View style={s.fields}>
            <InputField label="Store name" value={storeName} onChangeText={setStoreName}
              placeholder="e.g. Sharma General Store" returnKeyType="next"
              onSubmitEditing={() => (ownerRef.current as any)?.focus()} />
            <InputField label="Owner name" value={ownerName} onChangeText={setOwnerName}
              placeholder="e.g. Ram Sharma" inputRef={ownerRef} returnKeyType="next" />
            <DistrictPicker value={district} onSelect={setDistrict} />
            <InputField label="Password" value={password} onChangeText={setPassword}
              placeholder="Min. 6 characters" secureTextEntry inputRef={passwordRef}
              returnKeyType="next" onSubmitEditing={() => (confirmRef.current as any)?.focus()}
              autoCapitalize="none" />
            <InputField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword}
              placeholder="Re-enter password" secureTextEntry inputRef={confirmRef}
              returnKeyType="done" onSubmitEditing={handleRegister} autoCapitalize="none" />
          </View>
          <AuthError message={error} animStyle={errorStyle} />
          <Animated.View style={btnStyle}>
            <TouchableOpacity style={[s.btn, loading && s.btnLoading]} onPress={handleRegister}
              disabled={loading} activeOpacity={0.88}>
              {loading
                ? <View style={s.loadingRow}>
                    <View style={s.loadingDot} />
                    <View style={[s.loadingDot, s.loadingDotMid]} />
                    <View style={[s.loadingDot, s.loadingDotFaint]} />
                  </View>
                : <Text style={s.btnText}>Create my account →</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={ls.privacyNote}>By creating an account you agree to our terms of service.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ls = StyleSheet.create({
  backRow:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backText:    { fontSize: 15, fontFamily: typography.bodySemiBold, color: colors.white },
  privacyNote: { textAlign: "center", fontSize: 12, fontFamily: typography.body, color: 'rgba(255,255,255,0.55)', paddingHorizontal: spacing.md },
});
