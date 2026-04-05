import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { colors, spacing, radius, shadow } from "../../lib/theme";

interface LedgerEntry {
  id: number;
  type: "CREDIT" | "DEBIT";
  amount: number;
  description: string;
  reference?: string;
  createdAt: string;
}

type DateFilter = "TODAY" | "7D" | "30D";

function ManualEntryModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/admin/ledger", {
        type,
        amount: amt,
        description: description.trim(),
        reference: reference.trim() || undefined,
      });
      setAmount(""); setDescription(""); setReference(""); setType("CREDIT");
      onDone();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.handle} />
        <Text style={styles.modalTitle}>Manual ledger entry</Text>

        <Text style={styles.inputLabel}>Type</Text>
        <View style={styles.typeRow}>
          {(["CREDIT", "DEBIT"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                type === t && {
                  backgroundColor: t === "CREDIT" ? colors.green : "#DC2626",
                  borderColor: "transparent",
                },
              ]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Amount (Rs)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.gray400}
        />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Payment received from Sharma Store"
          placeholderTextColor={colors.gray400}
        />

        <Text style={styles.inputLabel}>Reference (optional)</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="Invoice #, receipt #…"
          placeholderTextColor={colors.gray400}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? "Saving…" : "Save entry"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export function LedgerScreen() {
  const [filter, setFilter] = useState<DateFilter>("7D");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const FILTER_DAYS: Record<DateFilter, number> = { TODAY: 0, "7D": 7, "30D": 30 };
  const FILTER_LABELS: Record<DateFilter, string> = { TODAY: "Today", "7D": "7 days", "30D": "30 days" };

  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin/ledger", {
        params: { days: FILTER_DAYS[filter] },
      });
      setEntries(res.data.entries ?? res.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [filter]);

  const totalCredit = entries.filter((e) => e.type === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const totalDebit = entries.filter((e) => e.type === "DEBIT").reduce((s, e) => s + e.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Ledger</Text>

      {/* Date filter chips */}
      <View style={styles.filterRow}>
        {(["TODAY", "7D", "30D"] as DateFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      {!loading && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: colors.green }]}>
            <Text style={styles.summaryLabel}>Credit</Text>
            <Text style={[styles.summaryAmt, { color: colors.green }]}>
              Rs {totalCredit.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#DC2626" }]}>
            <Text style={styles.summaryLabel}>Debit</Text>
            <Text style={[styles.summaryAmt, { color: "#DC2626" }]}>
              Rs {totalDebit.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: colors.blue }]}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryAmt,
                { color: totalCredit - totalDebit >= 0 ? colors.green : "#DC2626" },
              ]}
            >
              Rs {Math.abs(totalCredit - totalDebit).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.green} style={styles.loader} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.green}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, shadow.sm]}>
              <View
                style={[
                  styles.typeDot,
                  { backgroundColor: item.type === "CREDIT" ? colors.green : "#DC2626" },
                ]}
              />
              <View style={styles.cardBody}>
                <Text style={styles.description}>{item.description}</Text>
                {item.reference && (
                  <Text style={styles.reference}>Ref: {item.reference}</Text>
                )}
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text
                style={[
                  styles.amount,
                  { color: item.type === "CREDIT" ? colors.green : "#F87171" },
                ]}
              >
                {item.type === "CREDIT" ? "+" : "−"}Rs {item.amount.toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions in this period.</Text>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ Entry</Text>
      </TouchableOpacity>

      <ManualEntryModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onDone={() => { setLoading(true); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1120" },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + spacing.md,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#161E35",
  },
  chipActive: { backgroundColor: colors.green },
  chipText: { fontSize: 12, color: colors.gray400, fontWeight: "600" },
  chipTextActive: { color: "#0D1120" },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#161E35",
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    gap: 2,
  },
  summaryLabel: { fontSize: 10, color: colors.gray400, fontWeight: "600" },
  summaryAmt: { fontSize: 13, fontWeight: "700" },
  loader: { marginTop: spacing.xxl },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: 100 },
  card: {
    backgroundColor: "#161E35",
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  typeDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  cardBody: { flex: 1 },
  description: { fontSize: 13, fontWeight: "600", color: colors.white },
  reference: { fontSize: 11, color: colors.gray400, marginTop: 2 },
  date: { fontSize: 11, color: colors.gray600, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: "700" },
  emptyText: { color: colors.gray400, textAlign: "center", paddingVertical: spacing.xxl },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...shadow.md,
  },
  fabText: { color: "#0D1120", fontWeight: "700", fontSize: 14 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  inputLabel: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  typeBtnText: { fontSize: 13, color: colors.gray600, fontWeight: "600" },
  typeBtnTextActive: { color: colors.white },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
