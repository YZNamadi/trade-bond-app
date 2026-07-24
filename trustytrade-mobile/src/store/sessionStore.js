import { create } from "zustand";
import { configureAuthHooks } from "../services/apiClient";
import { clearAuthState, getAuthState, setAuthState } from "../services/storage";
import { fetchProfile, mobileLogin, mobileRegister, logout as apiLogout } from "../services/api";

function normalizeError(err) {
  const msg =
    err?.response?.data?.message ||
    err?.message ||
    "Something went wrong. Please try again.";
  return String(msg);
}

function generateDeviceId() {
  const rand = Math.random().toString(36).slice(2);
  const rand2 = Math.random().toString(36).slice(2);
  return `tt_${Date.now().toString(36)}_${rand}${rand2}`.slice(0, 64);
}

export const useSessionStore = create((set, get) => ({
  status: "loading",
  user: null,
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  authError: null,

  bootstrap: async () => {
    set({ status: "loading", authError: null });
    try {
      const saved = await getAuthState();
      set({
        accessToken: saved.accessToken,
        refreshToken: saved.refreshToken,
        deviceId: saved.deviceId,
      });
      if (!saved.accessToken && !saved.refreshToken) {
        set({ status: "unauthenticated", user: null });
        return;
      }
      const user = await fetchProfile();
      set({ status: "authenticated", user });
    } catch {
      await clearAuthState();
      set({
        status: "unauthenticated",
        user: null,
        accessToken: null,
        refreshToken: null,
        deviceId: null,
      });
    }
  },

  login: async ({ email, password }) => {
    set({ authError: null });
    try {
      const deviceId = get().deviceId || generateDeviceId();
      const res = await mobileLogin({ email, password, deviceId });
      const accessToken = String(res.accessToken || "");
      const refreshToken = String(res.refreshToken || "");
      const nextDeviceId = String(res.deviceId || deviceId);
      if (!accessToken || !refreshToken) throw new Error("Login failed");
      await setAuthState({ accessToken, refreshToken, deviceId: nextDeviceId });
      set({
        status: "authenticated",
        user: res.user || null,
        accessToken,
        refreshToken,
        deviceId: nextDeviceId,
      });
      return true;
    } catch (err) {
      set({ authError: normalizeError(err) });
      return false;
    }
  },

  register: async ({ email, password, fullName, username }) => {
    set({ authError: null });
    try {
      const deviceId = get().deviceId || generateDeviceId();
      const res = await mobileRegister({ email, password, fullName, username, deviceId });
      const accessToken = String(res.accessToken || "");
      const refreshToken = String(res.refreshToken || "");
      const nextDeviceId = String(res.deviceId || deviceId);
      if (!accessToken || !refreshToken) throw new Error("Register failed");
      await setAuthState({ accessToken, refreshToken, deviceId: nextDeviceId });
      set({
        status: "authenticated",
        user: res.user || null,
        accessToken,
        refreshToken,
        deviceId: nextDeviceId,
      });
      return true;
    } catch (err) {
      set({ authError: normalizeError(err) });
      return false;
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {}
    await clearAuthState();
    set({
      status: "unauthenticated",
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      authError: null,
    });
  },

  setSession: async ({ accessToken, refreshToken, deviceId, user }) => {
    const current = get();
    const next = {
      accessToken:
        accessToken === undefined
          ? current.accessToken
          : accessToken
            ? String(accessToken)
            : null,
      refreshToken:
        refreshToken === undefined
          ? current.refreshToken
          : refreshToken
            ? String(refreshToken)
            : null,
      deviceId:
        deviceId === undefined
          ? current.deviceId
          : deviceId
            ? String(deviceId)
            : null,
    };
    await setAuthState(next);
    set({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      deviceId: next.deviceId,
      user: user ?? current.user,
    });
  },
}));

configureAuthHooks({
  getAccessToken: () => useSessionStore.getState().accessToken,
  getRefreshToken: () => useSessionStore.getState().refreshToken,
  getDeviceId: () => useSessionStore.getState().deviceId,
  onUpdateTokens: async ({ accessToken, refreshToken, deviceId, user }) => {
    await useSessionStore.getState().setSession({ accessToken, refreshToken, deviceId, user });
  },
  onLogout: async () => {
    await useSessionStore.getState().logout();
  },
});
