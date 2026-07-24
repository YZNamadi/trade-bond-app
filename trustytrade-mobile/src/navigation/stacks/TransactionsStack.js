import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TransactionsListScreen from "../../screens/transactions/TransactionsListScreen";
import TransactionDetailScreen from "../../screens/transactions/TransactionDetailScreen";
import CreateTransactionScreen from "../../screens/transactions/CreateTransactionScreen";
import PaymentScreen from "../../screens/transactions/PaymentScreen";
import ChatScreen from "../../screens/transactions/ChatScreen";
import UpdateShippingScreen from "../../screens/transactions/UpdateShippingScreen";
import DeliveryProofsScreen from "../../screens/transactions/DeliveryProofsScreen";
import ReceiptScreen from "../../screens/transactions/ReceiptScreen";
import ReportIssueScreen from "../../screens/transactions/ReportIssueScreen";
import DisputeDetailScreen from "../../screens/disputes/DisputeDetailScreen";
import { colors } from "../../constants/theme";

const Stack = createNativeStackNavigator();

export default function TransactionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="TransactionsIndex" component={TransactionsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} options={{ title: "Start escrow" }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment" }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
      <Stack.Screen name="UpdateShipping" component={UpdateShippingScreen} options={{ title: "Shipping" }} />
      <Stack.Screen name="DeliveryProofs" component={DeliveryProofsScreen} options={{ title: "Proofs" }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: "Receipt" }} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: "Report issue" }} />
      <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} options={{ title: "Dispute" }} />
    </Stack.Navigator>
  );
}
