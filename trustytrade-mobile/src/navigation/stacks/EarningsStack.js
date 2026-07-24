import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SellerEarningsScreen from "../../screens/earnings/SellerEarningsScreen";
import { colors } from "../../constants/theme";

const Stack = createNativeStackNavigator();

export default function EarningsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="EarningsIndex" component={SellerEarningsScreen} options={{ title: "Earnings" }} />
    </Stack.Navigator>
  );
}
