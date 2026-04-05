import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../lib/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.gray200,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={sk.card}>
      <Skeleton height={120} borderRadius={12} />
      <Skeleton height={14} width="80%" style={{ marginTop: 8 }} />
      <Skeleton height={12} width="50%" style={{ marginTop: 4 }} />
      <Skeleton height={18} width="60%" style={{ marginTop: 6 }} />
    </View>
  );
}

export function AnnouncementSkeleton() {
  return (
    <View style={sk.announcement}>
      <Skeleton height={96} borderRadius={16} />
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    width: 152,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 10,
    gap: 4,
  },
  announcement: {
    width: 270,
    marginRight: 0,
  },
});
