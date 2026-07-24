import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TrustyTagSearchScreen from "../../screens/search/TrustyTagSearchScreen";
import CreateTransactionScreen from "../../screens/transactions/CreateTransactionScreen";
import { colors } from "../../constants/theme";

const Stack = createNativeStackNavigator();

export default function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="SearchIndex" component={TrustyTagSearchScreen} options={{ title: "TrustyTag" }} />
      <Stack.Screen name="CreateFromSearch" component={CreateTransactionScreen} options={{ title: "Start escrow" }} />
    </Stack.Navigator>
  );
}

