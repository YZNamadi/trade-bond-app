import axios from "axios";
import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

function extractHostname(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value).hostname || null;
  } catch {
    const clean = String(value).replace(/^[a-z]+:\/\//i, "");
    const first = clean.split("/")[0] || "";
    const host = first.split(":")[0] || "";
    return host || null;
  }
}

function getDevHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  const expoHostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.linkingUri;

  return extractHostname(scriptURL) || extractHostname(expoHostUri);
}

function isPrivateIPv4(host) {
  if (!host || typeof host !== "string") return false;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function resolveBaseURL() {
  const envURL = String(process.env.EXPO_PUBLIC_API_URL || "").trim();
  const devHost = getDevHost();
  const envHost = extractHostname(envURL);

  if (__DEV__ && devHost) {
    if (envURL && envHost && (envHost === devHost || !isPrivateIPv4(envHost))) {
      return envURL;
    }
    return `http://${devHost}:3001/api`;
  }

  if (envURL) return envURL;

  if (__DEV__ && Platform.OS === "android") {
    return "http://10.0.2.2:3001/api";
  }

  return "http://localhost:3001/api";
}

const baseURL = resolveBaseURL();

const api = axios.create({
  baseURL,
  timeout: 20000,
});

const state = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  getDeviceId: () => null,
  onUpdateTokens: async () => {},
  onLogout: async () => {},
  refreshing: null,
};

export function configureAuthHooks(input) {
  state.getAccessToken = input.getAccessToken;
  state.getRefreshToken = input.getRefreshToken;
  state.getDeviceId = input.getDeviceId;
  state.onUpdateTokens = input.onUpdateTokens;
  state.onLogout = input.onLogout;
}

api.interceptors.request.use(async (config) => {
  const accessToken = state.getAccessToken();
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers = config.headers || {};
  config.headers["X-Client-Platform"] = "mobile";
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;
    if (!original || original.__isRetryRequest) throw error;
    if (status !== 401) throw error;

    const refreshToken = state.getRefreshToken();
    const deviceId = state.getDeviceId();
    if (!refreshToken || !deviceId) {
      await state.onLogout();
      throw error;
    }

    if (!state.refreshing) {
      state.refreshing = (async () => {
        const res = await axios.post(
          `${baseURL}/auth/mobile/refresh`,
          { refreshToken, deviceId },
          { timeout: 20000, headers: { "X-Client-Platform": "mobile" } },
        );
        const payload = res?.data || {};
        if (!payload?.accessToken || !payload?.refreshToken) {
          throw new Error("Refresh failed");
        }
        await state.onUpdateTokens({
          accessToken: String(payload.accessToken),
          refreshToken: String(payload.refreshToken),
          deviceId: String(payload.deviceId || deviceId),
          user: payload.user || null,
        });
      })()
        .catch(async () => {
          await state.onLogout();
          throw error;
        })
        .finally(() => {
          state.refreshing = null;
        });
    }

    await state.refreshing;
    original.__isRetryRequest = true;
    return api(original);
  },
);

export { api, baseURL };
