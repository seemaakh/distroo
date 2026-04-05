import { View, StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/buyer/HomeScreen";
import { CatalogueScreen } from "../screens/buyer/CatalogueScreen";
import { ProductScreen } from "../screens/buyer/ProductScreen";
import { CartScreen } from "../screens/buyer/CartScreen";
import { CheckoutScreen } from "../screens/buyer/CheckoutScreen";
import { OrderConfirmScreen } from "../screens/buyer/OrderConfirmScreen";
import { OrdersScreen } from "../screens/buyer/OrdersScreen";
import { OrderDetailScreen } from "../screens/buyer/OrderDetailScreen";
import { AccountScreen } from "../screens/buyer/AccountScreen";
import { useCartStore } from "../store/cartStore";
import { colors, radius, typography } from "../lib/theme";

const Tab = createBottomTabNavigator();
const CatalogueStack = createStackNavigator();
const CartStack = createStackNavigator();
const OrdersStack = createStackNavigator();

function CatalogueNavigator() {
  return (
    <CatalogueStack.Navigator screenOptions={{ headerShown: false }}>
      <CatalogueStack.Screen name="CatalogueList" component={CatalogueScreen} />
      <CatalogueStack.Screen name="Product" component={ProductScreen} />
    </CatalogueStack.Navigator>
  );
}

function CartNavigator() {
  return (
    <CartStack.Navigator screenOptions={{ headerShown: false }}>
      <CartStack.Screen name="CartMain" component={CartScreen} />
      <CartStack.Screen name="Checkout" component={CheckoutScreen} />
      <CartStack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
    </CartStack.Navigator>
  );
}

function OrdersNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrdersList" component={OrdersScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  );
}

type TabIconConfig = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

function TabIcon({ name, icon, iconFocused, focused, badge }: TabIconConfig & { focused: boolean }) {
  const progress = useSharedValue(focused ? 1 : 0);

  if (focused) {
    progress.value = withSpring(1, { damping: 18, stiffness: 200 });
  } else {
    progress.value = withTiming(0, { duration: 180 });
  }

  const dotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    transform: [{ scale: withSpring(focused ? 1 : 0, { damping: 20, stiffness: 300 }) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(focused ? 1.08 : 1, { damping: 20, stiffness: 300 }) },
    ],
  }));

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={22}
          color={focused ? colors.blue : colors.gray400}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {name}
      </Text>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
      <Animated.View style={[styles.tabDot, dotStyle]} />
    </View>
  );
}

export function BuyerTabs() {
  const totalItems = useCartStore((s) => s.totalItems());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Home" icon="home-outline" iconFocused="home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Catalogue"
        component={CatalogueNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Browse" icon="grid-outline" iconFocused="grid" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="Cart"
              icon="bag-outline"
              iconFocused="bag"
              focused={focused}
              badge={totalItems}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="Orders"
              icon="receipt-outline"
              iconFocused="receipt"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Account" icon="person-outline" iconFocused="person" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.gray100,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    position: "relative",
    minWidth: 52,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.gray400,
    fontFamily: typography.bodyMedium,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: colors.blue,
    fontFamily: typography.bodySemiBold,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -2,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    minWidth: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: typography.bodySemiBold,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.blue,
    position: "absolute",
    bottom: -6,
  },
});
