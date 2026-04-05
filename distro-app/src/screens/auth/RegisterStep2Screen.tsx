import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, radius } from "../../lib/theme";
import { AuthStackParamList } from "../../navigation/AuthStack";

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

export function RegisterStep2Screen({ navigation, route }: Props) {
  const { phone, otpToken } = route.params;
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [district, setDistrict] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleRegister = async () => {
    if (!storeName.trim() || !ownerName.trim() || !district || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        phone,
        otpToken,
        storeName,
        ownerName,
        district,
        password,
      });
      await setAuth(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.message ?? "Registration failed.");
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Your store details</Text>
        <Text style={styles.subtitle}>
          Step 2 of 2 — almost done!
        </Text>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Store name</Text>
            <TextInput
              style={styles.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Sharma General Store"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Owner name</Text>
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="e.g. Ram Sharma"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>District</Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerBtn]}
              onPress={() => setShowDistrictPicker(!showDistrictPicker)}
            >
              <Text style={district ? styles.pickerValue : styles.pickerPlaceholder}>
                {district || "Select district"}
              </Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </TouchableOpacity>

            {showDistrictPicker && (
              <View style={styles.dropdownWrap}>
                <ScrollView
                  style={styles.dropdown}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {NEPAL_DISTRICTS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dropdownItem,
                        district === d && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setDistrict(d);
                        setShowDistrictPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          district === d && styles.dropdownTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              secureTextEntry
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry
              placeholderTextColor={colors.gray400}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Create account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.offWhite },
  container: { flexGrow: 1, padding: spacing.lg, paddingTop: 60 },
  backBtn: { marginBottom: spacing.lg },
  backText: { color: colors.blue, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 14, color: colors.gray600, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerValue: { fontSize: 15, color: colors.ink },
  pickerPlaceholder: { fontSize: 15, color: colors.gray400 },
  pickerChevron: { color: colors.gray400, fontSize: 16 },
  dropdownWrap: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    overflow: "hidden",
    marginTop: -spacing.xs,
  },
  dropdown: { maxHeight: 200, backgroundColor: colors.white },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  dropdownItemActive: { backgroundColor: colors.blueLight },
  dropdownText: { fontSize: 14, color: colors.ink },
  dropdownTextActive: { color: colors.blue, fontWeight: "700" },
  error: {
    color: "#DC2626",
    fontSize: 13,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  btn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
