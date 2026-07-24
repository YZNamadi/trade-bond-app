import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthStack from "./stacks/AuthStack";
import AppTabs from "./tabs/AppTabs";
import { useSessionStore } from "../store/sessionStore";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const status = useSessionStore((s) => s.status);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === "authenticated" ? (
        <Stack.Screen name="App" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

