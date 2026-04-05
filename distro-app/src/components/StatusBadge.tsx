import { View, Text, StyleSheet } from "react-native";
import { colors, radius, typography, statusColors } from "../lib/theme";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const sc = statusColors[status] ?? { bg: colors.gray100, text: colors.gray600, dot: colors.gray400 };
  const isMd = size === "md";

  return (
    <View style={[styles.badge, { backgroundColor: sc.bg }, isMd && styles.badgeMd]}>
      <View style={[styles.dot, { backgroundColor: sc.dot }]} />
      <Text style={[styles.text, { color: sc.text }, isMd && styles.textMd]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  text: { fontSize: 11, fontFamily: typography.bodySemiBold, letterSpacing: 0.2 },
  textMd: { fontSize: 13 },
});
