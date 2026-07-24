import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NotificationsScreen from "../../screens/notifications/NotificationsScreen";
import DisputeDetailScreen from "../../screens/disputes/DisputeDetailScreen";
import { colors } from "../../constants/theme";

const Stack = createNativeStackNavigator();

export default function NotificationsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="NotificationsIndex" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} options={{ title: "Dispute" }} />
    </Stack.Navigator>
  );
}
