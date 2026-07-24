import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StackActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import HomeStack from "../stacks/HomeStack";
import TransactionsStack from "../stacks/TransactionsStack";
import SearchStack from "../stacks/SearchStack";
import EarningsStack from "../stacks/EarningsStack";
import NotificationsStack from "../stacks/NotificationsStack";
import SettingsStack from "../stacks/SettingsStack";
import { alpha, colors, radius } from "../../constants/theme";
import { useSessionStore } from "../../store/sessionStore";

const Tab = createBottomTabNavigator();

function iconFor(routeName, focused) {
  const color = focused ? colors.primary : colors.muted;
  const size = 22;
  if (routeName === "Home") return <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />;
  if (routeName === "Transactions") return <Ionicons name={focused ? "swap-horizontal" : "swap-horizontal-outline"} size={size} color={color} />;
  if (routeName === "Earnings") return <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={size} color={color} />;
  if (routeName === "Search") return <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />;
  if (routeName === "Notifications") return <Ionicons name={focused ? "notifications" : "notifications-outline"} size={size} color={color} />;
  return <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />;
}

export default function AppTabs() {
  const user = useSessionStore((s) => s.user);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";

  function resetTabStack(navigation, tabName, initialScreen) {
    const state = navigation.getState();
    const tabRoute = Array.isArray(state?.routes) ? state.routes.find((route) => route.name === tabName) : null;
    const nestedKey = tabRoute?.state?.key;

    if (nestedKey) {
      navigation.dispatch({
        ...StackActions.popToTop(),
        target: nestedKey,
      });
      navigation.navigate(tabName, { screen: initialScreen });
      return;
    }

    navigation.navigate(tabName, { screen: initialScreen });
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: alpha("#050505", 0.96),
          borderTopColor: colors.border,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarItemStyle: { borderRadius: radius.md },
        tabBarIconStyle: { marginBottom: 2 },
        tabBarActiveBackgroundColor: alpha(colors.primary, 0.12),
        tabBarIcon: ({ focused }) => iconFor(route.name, focused),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: isSeller ? "Dashboard" : "Home" }} />
      <Tab.Screen name="Transactions" component={TransactionsStack} options={{ tabBarLabel: isSeller ? "Orders" : "Transactions" }} />
      {isSeller ? <Tab.Screen name="Earnings" component={EarningsStack} /> : <Tab.Screen name="Search" component={SearchStack} />}
      <Tab.Screen
        name="Notifications"
        component={NotificationsStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetTabStack(navigation, "Notifications", "NotificationsIndex");
          },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetTabStack(navigation, "Settings", "SettingsIndex");
          },
        })}
      />
    </Tab.Navigator>
  );
}
