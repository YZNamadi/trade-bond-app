import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "../../screens/settings/SettingsScreen";
import ProfileScreen from "../../screens/settings/ProfileScreen";
import BankAccountScreen from "../../screens/settings/BankAccountScreen";
import SellerApplyScreen from "../../screens/settings/SellerApplyScreen";
import SellerVerificationScreen from "../../screens/settings/SellerVerificationScreen";
import DisputesListScreen from "../../screens/disputes/DisputesListScreen";
import DisputeDetailScreen from "../../screens/disputes/DisputeDetailScreen";
import { colors } from "../../constants/theme";

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SettingsIndex"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="BankAccount" component={BankAccountScreen} options={{ title: "Bank account" }} />
      <Stack.Screen name="SellerApply" component={SellerApplyScreen} options={{ title: "Become a seller" }} />
      <Stack.Screen name="SellerVerification" component={SellerVerificationScreen} options={{ title: "Seller verification" }} />
      <Stack.Screen name="Disputes" component={DisputesListScreen} options={{ title: "Disputes" }} />
      <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} options={{ title: "Dispute" }} />
    </Stack.Navigator>
  );
}
