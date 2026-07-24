import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const keys = {
  accessToken: "tt_access_token",
  refreshToken: "tt_refresh_token",
  deviceId: "tt_device_id",
  notifications: "tt_notifications",
};

export async function getAuthState() {
  const [accessToken, refreshToken, deviceId] = await Promise.all([
    SecureStore.getItemAsync(keys.accessToken),
    SecureStore.getItemAsync(keys.refreshToken),
    SecureStore.getItemAsync(keys.deviceId),
  ]);
  return {
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    deviceId: deviceId || null,
  };
}

export async function setAuthState(next) {
  const ops = [];
  if (typeof next.accessToken === "string") ops.push(SecureStore.setItemAsync(keys.accessToken, next.accessToken));
  if (typeof next.refreshToken === "string") ops.push(SecureStore.setItemAsync(keys.refreshToken, next.refreshToken));
  if (typeof next.deviceId === "string") ops.push(SecureStore.setItemAsync(keys.deviceId, next.deviceId));
  await Promise.all(ops);
}

export async function clearAuthState() {
  await Promise.all([
    SecureStore.deleteItemAsync(keys.accessToken),
    SecureStore.deleteItemAsync(keys.refreshToken),
    SecureStore.deleteItemAsync(keys.deviceId),
  ]);
}

function notificationKey(scope = "default") {
  return `${keys.notifications}:${scope}`;
}

export async function getNotificationState(scope = "default") {
  try {
    const raw = await AsyncStorage.getItem(notificationKey(scope));
    if (!raw) return { readIds: [] };
    const parsed = JSON.parse(raw);
    return {
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds.map((item) => String(item)) : [],
    };
  } catch {
    return { readIds: [] };
  }
}

export async function setNotificationState(scope = "default", next = {}) {
  const payload = {
    readIds: Array.isArray(next?.readIds) ? next.readIds.map((item) => String(item)) : [],
  };
  await AsyncStorage.setItem(notificationKey(scope), JSON.stringify(payload));
}
