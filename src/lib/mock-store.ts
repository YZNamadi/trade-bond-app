import { useSyncExternalStore } from "react";

export type Role = "buyer" | "seller" | "admin";

export type TxState =
  | "CREATED"
  | "FUNDED"
  | "SHIPPED"
  | "DELIVERED"
  | "RELEASE_PENDING"
  | "RELEASED"
  | "DISPUTED"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface Seller {
  id: string;
  name: string;
  handle: string;
  trustyTag?: string | null;
  avatar: string;
  rating: number;
  reviews: number;
  category: string;
  verified: boolean;
  completedDeals: number;
  bio: string;
}

export interface Transaction {
  id: string;
  reference: string;
  title: string;
  description: string;
  amount: number;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  sellerTrustyTag?: string | null;
  trackingId?: string | null;
  state: TxState;
  createdAt: number;
  updatedAt: number;
  category: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
}

interface State {
  session: Session | null;
  accounts: Session[];
  activeAccountId: string | null;
  transactions: Transaction[];
  sellers: Seller[];
  notifications: Notification[];
}

type ApiRole = "buyer" | "seller" | "admin";
type ApiUser = {
  id: string;
  email: string;
  username?: string | null;
  fullName?: string | null;
  phone?: string | null;
  role: ApiRole;
  isVerified?: boolean;
  trustyTag?: string | null;
};
type ApiTransactionStatus = "CREATED" | "FUNDED" | "SHIPPED" | "DELIVERED" | "RELEASED" | "DISPUTED" | "REFUNDED";
type ApiTransactionStatusV2 =
  | "CREATED"
  | "FUNDED"
  | "SHIPPED"
  | "DELIVERED"
  | "RELEASE_PENDING"
  | "RELEASED"
  | "DISPUTED"
  | "REFUND_PENDING"
  | "REFUNDED";
type ApiTransaction = {
  id: string;
  amount: number | string;
  description: string;
  status: ApiTransactionStatus | ApiTransactionStatusV2;
  paymentReference?: string | null;
  trackingId?: string | null;
  buyerId: string;
  sellerId: string;
  buyer: ApiUser;
  seller: ApiUser;
  createdAt: string | number;
  updatedAt?: string | number | null;
};

type ApiTransactionEvent = {
  id?: string;
  transactionId: string;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | number;
};

type ApiTransactionMessage = {
  id: string;
  transactionId: string;
  senderRole: "buyer" | "seller" | "admin" | string;
  body: string;
  createdAt: string | number;
};

type ApiReceipt = {
  receiptId: string;
  receiptHash: string;
  transactionId: string;
  amount: number | string;
  status: ApiTransactionStatus;
  paymentReferenceMasked: string | null;
  createdAt: string | number;
  updatedAt?: string | number | null;
  buyer: ApiUser;
  seller: ApiUser;
};

type ApiProof = {
  id: string;
  createdAt: string | number;
  note: string | null;
  mimeType: string;
  size: number;
  originalFileName: string;
};

type ApiBank = {
  name: string;
  code: string;
  slug: string | null;
};

type ApiBankAccount = {
  linked: boolean;
  bankName: string | null;
  bankCode: string | null;
  accountName: string | null;
  accountNumberMasked: string | null;
  verifiedAt: string | null;
};

type ApiDisputeStatus =
  | "NONE"
  | "OPENED"
  | "UNDER_REVIEW"
  | "EVIDENCE_SUBMITTED_BY_BUYER"
  | "EVIDENCE_SUBMITTED_BY_SELLER"
  | "AWAITING_ADMIN_REVIEW"
  | "IN_MEDIATION"
  | "ESCALATED_TO_ARBITRATION"
  | "RESOLVED_FOR_BUYER"
  | "RESOLVED_FOR_SELLER"
  | "PARTIAL_REFUND"
  | "REJECTED"
  | "CLOSED";

type ApiDisputeEvidence = {
  id: string;
  createdAt: string | number;
  uploadedByUserId: string;
  uploadedByRole: string;
  note: string | null;
  mimeType: string;
  size: number;
  originalFileName: string;
  sha256: string;
  annotations?: Array<{ at: string; byUserId: string; byRole: string; text: string }>;
};

type ApiDisputeEvent = {
  id: string;
  seq: number;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  requestId: string | null;
  createdAt: string | number;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  hash: string;
  prevHash: string | null;
};

type ApiDispute = {
  id: string;
  transactionId: string;
  buyerId: string;
  sellerId: string;
  status: ApiDisputeStatus;
  openedAt: string | number | null;
  closedAt: string | number | null;
  updatedAt: string | number;
  version?: number | null;
  decision?: any;
  evidence: ApiDisputeEvidence[];
  events: ApiDisputeEvent[];
};

type ApiSellerOnboardingStatus = "PENDING" | "APPROVED" | "REJECTED";
type ApiSellerOnboardingRequest = {
  id: string;
  userId: string;
  status: ApiSellerOnboardingStatus;
  desiredTrustyTag?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumberLast4?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | number | null;
  reviewNote?: string | null;
  createdAt: string | number;
  updatedAt?: string | number | null;
};

type ApiAdminDisputeListItem = {
  id: string;
  transactionId: string;
  status: string;
  openedAt: string | number | null;
  closedAt: string | number | null;
  updatedAt: string | number | null;
};

type ApiAdminDispute = {
  id: string;
  transactionId: string;
  status: string;
  openedAt: string | number | null;
  closedAt: string | number | null;
  decision?: any;
  transactionSnapshot?: any;
  events: Array<{ id?: string; seq: number; type: string; createdAt: string | number; actorRole?: string | null; actorUserId?: string | null; metadata?: any }>;
  evidence: Array<{ id: string; createdAt: string | number; originalFileName: string; mimeType: string; size: number; note?: string | null }>;
};

type ApiAdminTransactionListItem = {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  paymentReference?: string | null;
  payoutStatus?: string | null;
  payoutReference?: string | null;
  refundStatus?: string | null;
  refundProviderRefundId?: string | null;
  createdAt: string | number;
  updatedAt?: string | number | null;
  buyer?: { id: string; email?: string | null; fullName?: string | null } | null;
  seller?: { id: string; email?: string | null; fullName?: string | null; trustyTag?: string | null } | null;
};

type ApiLedgerEntry = {
  id: string;
  transactionId: string;
  eventType: string;
  amountMinor: number;
  currency: string;
  provider: string | null;
  providerRef: string | null;
  metadata: any;
  createdAt: string | number;
};

const initial: State = {
  session: null,
  accounts: [],
  activeAccountId: null,
  transactions: [],
  sellers: [],
  notifications: [],
};

const STORAGE_KEY = "trustytrade_state_v3";

function apiBaseUrl() {
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (envUrl) {
    const raw = envUrl.replace(/\/$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }
  return "/api";
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

function csrfHeader(): Record<string, string> {
  const token = readCookie("csrf_token");
  return token ? { "X-CSRF-Token": token } : {};
}

function randomId(): string {
  const c = (globalThis as any)?.crypto as Crypto | undefined;
  const randomUUID = (c as any)?.randomUUID as (() => string) | undefined;
  if (typeof randomUUID === "function") return randomUUID.call(c);
  const getRandomValues = c?.getRandomValues?.bind(c);
  if (getRandomValues) {
    const b = new Uint8Array(16);
    getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return `tt_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

async function apiRequest<T>(path: string, init?: RequestInit & { _retry?: boolean; _retryCsrf?: boolean; _idempotencyKey?: string }): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const isMutating = !(method === "GET" || method === "HEAD");
  const idempotencyKey = init?._idempotencyKey || (isMutating ? randomId() : undefined);
  const headers: Record<string, string> = {
    ...(init?.headers as any),
    ...(isMutating ? csrfHeader() : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && !init?._retry && path !== "/auth/refresh" && path !== "/auth/login" && path !== "/auth/register") {
    await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { ...csrfHeader(), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      credentials: "include",
    }).catch(() => null);
    return apiRequest<T>(path, { ...(init || {}), _retry: true, _idempotencyKey: idempotencyKey });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 403 && isMutating && !init?._retryCsrf) {
      try {
        const json = JSON.parse(text) as any;
        const msg = typeof json?.message === "string" ? json.message : "";
        if (msg.toLowerCase().includes("csrf")) {
          await fetch(`${apiBaseUrl()}/auth/profile`, { method: "GET", credentials: "include" }).catch(() => null);
          return apiRequest<T>(path, { ...(init || {}), _retryCsrf: true, _idempotencyKey: idempotencyKey });
        }
      } catch {}
    }
    try {
      const json = JSON.parse(text) as any;
      const msg = typeof json?.message === "string" ? json.message : "";
      throw new Error(msg || `Request failed: ${res.status}`);
    } catch {
      throw new Error(text || `Request failed: ${res.status}`);
    }
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function apiUpload<T>(path: string, form: FormData, init?: RequestInit & { _retry?: boolean; _idempotencyKey?: string }): Promise<T> {
  const idempotencyKey = init?._idempotencyKey || randomId();
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    ...init,
    headers: {
      ...(init?.headers as any),
      ...csrfHeader(),
      "Idempotency-Key": idempotencyKey,
    },
    body: form,
    credentials: "include",
  });
  if (res.status === 401 && !init?._retry && path !== "/auth/refresh") {
    await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { ...csrfHeader(), "Idempotency-Key": idempotencyKey },
      credentials: "include",
    }).catch(() => null);
    return apiUpload<T>(path, form, { ...(init || {}), _retry: true, _idempotencyKey: idempotencyKey });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const json = JSON.parse(text) as any;
      const msg = typeof json?.message === "string" ? json.message : "";
      throw new Error(msg || `Request failed: ${res.status}`);
    } catch {
      throw new Error(text || `Request failed: ${res.status}`);
    }
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase();
}

function parseTitleAndDescription(desc: string): { title: string; description: string } {
  const parts = (desc || "").split(" — ");
  if (parts.length <= 1) return { title: desc || "Item", description: "" };
  return { title: parts[0] || "Item", description: parts.slice(1).join(" — ") };
}

function mapTxState(t: ApiTransaction): TxState {
  return t.status;
}

function toClientTx(t: ApiTransaction): Transaction {
  const { title, description } = parseTitleAndDescription(t.description);
  const createdAt = typeof t.createdAt === "string" ? Date.parse(t.createdAt) : Number(t.createdAt);
  const updatedAtRaw = t.updatedAt ?? t.createdAt;
  const updatedAt = typeof updatedAtRaw === "string" ? Date.parse(updatedAtRaw) : Number(updatedAtRaw);
  const amount = typeof t.amount === "string" ? Number(t.amount) : t.amount;
  return {
    id: t.id,
    reference: t.paymentReference || `TT-${t.id.slice(0, 8).toUpperCase()}`,
    title,
    description,
    amount: Number.isFinite(amount) ? amount : 0,
    buyerName: t.buyer?.fullName || t.buyer?.email || "Buyer",
    sellerId: t.sellerId,
    sellerName: t.seller?.fullName || t.seller?.username || t.seller?.email || "Seller",
    sellerTrustyTag: t.seller?.trustyTag ?? (t.seller?.username ? `@${t.seller.username}` : null),
    trackingId: t.trackingId ?? null,
    state: mapTxState(t),
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    category: "General",
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sanitizeTx(v: unknown): Transaction | null {
  if (!isPlainObject(v)) return null;
  const id = typeof v.id === "string" ? v.id : null;
  if (!id) return null;
  const stateVal = typeof v.state === "string" ? v.state : null;
  const allowed: TxState[] = ["CREATED", "FUNDED", "SHIPPED", "DELIVERED", "RELEASE_PENDING", "RELEASED", "DISPUTED", "REFUND_PENDING", "REFUNDED"];
  const state = (allowed as string[]).includes(stateVal ?? "") ? (stateVal as TxState) : null;
  if (!state) return null;
  const amountRaw = (v as any).amount;
  const amountNum = typeof amountRaw === "number" ? amountRaw : typeof amountRaw === "string" ? Number(amountRaw) : 0;
  const amount = Number.isFinite(amountNum) ? amountNum : 0;
  const createdAtRaw = (v as any).createdAt;
  const updatedAtRaw = (v as any).updatedAt;
  const createdAt = Number.isFinite(Number(createdAtRaw)) ? Number(createdAtRaw) : Date.now();
  const updatedAt = Number.isFinite(Number(updatedAtRaw)) ? Number(updatedAtRaw) : createdAt;
  const title = typeof v.title === "string" ? v.title : "Item";
  const description = typeof v.description === "string" ? v.description : "";
  const reference = typeof v.reference === "string" ? v.reference : `TT-${id.slice(0, 8).toUpperCase()}`;
  const buyerName = typeof v.buyerName === "string" ? v.buyerName : "Buyer";
  const sellerId = typeof v.sellerId === "string" ? v.sellerId : "";
  const sellerName = typeof v.sellerName === "string" ? v.sellerName : "Seller";
  const sellerTrustyTag = typeof (v as any).sellerTrustyTag === "string" ? ((v as any).sellerTrustyTag as string) : null;
  const trackingId = typeof (v as any).trackingId === "string" ? ((v as any).trackingId as string) : null;
  const category = typeof v.category === "string" ? v.category : "General";
  return {
    id,
    reference,
    title,
    description,
    amount,
    buyerName,
    sellerId,
    sellerName,
    sellerTrustyTag,
    trackingId,
    state,
    createdAt,
    updatedAt,
    category,
  };
}

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<State>;
    const loaded = { ...initial, ...parsed };
    const safeAccounts = Array.isArray(loaded.accounts) ? loaded.accounts.filter(Boolean) : [];
    const safeTransactions = Array.isArray(loaded.transactions) ? loaded.transactions.map(sanitizeTx).filter(Boolean) : [];
    const safeSellers = Array.isArray(loaded.sellers) ? loaded.sellers.filter(Boolean) : [];
    const safeNotifications = Array.isArray(loaded.notifications) ? loaded.notifications.filter(Boolean) : [];
    const byUserId = new Map<string, Session>();
    for (const a of safeAccounts) {
      if (a?.userId) byUserId.set(a.userId, a);
    }
    return {
      ...loaded,
      accounts: Array.from(byUserId.values()),
      transactions: safeTransactions as any,
      sellers: safeSellers as any,
      notifications: safeNotifications as any,
    };
  } catch {
    return initial;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const store = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get(): State { return state; },
  setSession(s: Session | null) {
    if (!s) {
      state = { ...state, session: null, activeAccountId: null };
      persist();
      return;
    }
    const nextAccounts = [
      ...state.accounts.filter((a) => a.userId !== s.userId),
      s,
    ];
    state = { ...state, session: s, accounts: nextAccounts, activeAccountId: s.userId };
    persist();
  },
  setActiveAccountId(userId: string) {
    state = { ...state, activeAccountId: userId };
    persist();
  },
  forgetAccount(userId: string) {
    const accounts = state.accounts.filter((a) => a.userId !== userId);
    const session = state.session?.userId === userId ? null : state.session;
    const activeAccountId = state.activeAccountId === userId ? null : state.activeAccountId;
    state = { ...state, accounts, session, activeAccountId };
    persist();
  },
  async bootstrap() {
    if (typeof window === "undefined") return;
    const saved = load();
    state = {
      ...state,
      accounts: saved.accounts,
      activeAccountId: saved.activeAccountId ?? state.activeAccountId,
      transactions: saved.transactions,
      sellers: saved.sellers,
      notifications: saved.notifications,
    };
    persist();
    try {
      const user = await apiRequest<ApiUser>("/auth/profile");
      const session: Session = {
        userId: user.id,
        email: user.email,
        name: user.fullName || user.email.split("@")[0],
        role: (user.role === "admin" ? "admin" : user.role === "seller" ? "seller" : "buyer") as Role,
        verified: Boolean(user.isVerified),
      };
      store.setSession(session);
      await store.refreshTransactions();
    } catch {
      state = { ...state, session: null, transactions: [], sellers: [] };
      persist();
    }
  },
  async login(email: string, password: string) {
    const res = await apiRequest<{ user: ApiUser }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const user = res.user;
    const session: Session = {
      userId: user.id,
      email: user.email,
      name: user.fullName || user.email.split("@")[0],
      role: (user.role === "admin" ? "admin" : user.role === "seller" ? "seller" : "buyer") as Role,
      verified: Boolean(user.isVerified),
    };
    store.setSession(session);
    await store.refreshTransactions();
    return session;
  },
  async signup(input: { name: string; email: string; password: string; role: Role }) {
    const res = await apiRequest<{ user: ApiUser }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: input.name, email: input.email, password: input.password }),
    });
    const user = res.user;
    const session: Session = {
      userId: user.id,
      email: user.email,
      name: user.fullName || input.name,
      role: (user.role === "admin" ? "admin" : user.role === "seller" ? "seller" : "buyer") as Role,
      verified: Boolean(user.isVerified),
    };
    store.setSession(session);
    await store.refreshTransactions();
    return session;
  },
  async signOut() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("csrf")) {
        await fetch(`${apiBaseUrl()}/auth/profile`, { method: "GET", credentials: "include" }).catch(() => null);
        try {
          await apiRequest("/auth/logout", { method: "POST" });
        } catch {}
      }
    }
    state = { ...state, session: null, transactions: [], sellers: [] };
    persist();
  },
  async lookupSellerByTrustyTag(trustyTag: string) {
    type SellerLookup = {
      id: string;
      fullName?: string | null;
      username?: string | null;
      trustyTag?: string | null;
      createdAt?: string | number | null;
    };
    const u = await apiRequest<SellerLookup | null>(`/users/trustytag/${encodeURIComponent(trustyTag)}`);
    if (!u || !u.id) throw new Error("Seller not found or not verified");
    const name = u.fullName || u.username || "Verified seller";
    const rawUsername = u.username ? String(u.username) : "";
    const trusty = u.trustyTag || (rawUsername ? (rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`) : null);
    const seller: Seller = {
      id: u.id,
      name,
      handle: trusty || `seller-${u.id.slice(0, 6)}`,
      trustyTag: trusty,
      avatar: initials(name),
      rating: 4.8,
      reviews: 120,
      category: "General",
      verified: true,
      completedDeals: 0,
      bio: "",
    };
    return seller;
  },
  async listBanks() {
    if (!state.session) throw new Error("Not authenticated");
    return apiRequest<ApiBank[]>("/paystack/banks");
  },
  async fetchMyBankAccount() {
    if (!state.session) throw new Error("Not authenticated");
    return apiRequest<ApiBankAccount>("/users/me/bank-account");
  },
  async linkMyBankAccount(input: { bankCode: string; accountNumber: string; accountName?: string }) {
    if (!state.session) throw new Error("Not authenticated");
    return apiRequest<ApiBankAccount>("/users/me/bank-account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async refreshTransactions() {
    if (!state.session) return [];
    const data = await apiRequest<ApiTransaction[]>("/transactions");
    const mapped = data.map(toClientTx);
    const mine = state.session.role === "buyer"
      ? mapped.filter((t) => data.find((x) => x.id === t.id)?.buyerId === state.session!.userId)
      : mapped.filter((t) => data.find((x) => x.id === t.id)?.sellerId === state.session!.userId);
    state = { ...state, transactions: mine };
    persist();
    return mine;
  },
  async refreshTransaction(id: string) {
    if (!state.session) return null;
    const data = await apiRequest<ApiTransaction>(`/transactions/${id}`);
    const tx = toClientTx(data);
    state = { ...state, transactions: [tx, ...state.transactions.filter((t) => t.id !== id)] };
    persist();
    return tx;
  },
  async fetchTransactionEvents(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    const events = await apiRequest<ApiTransactionEvent[]>(`/transactions/${id}/events`);
    return events.map((e) => ({
      ...e,
      createdAt: typeof e.createdAt === "string" ? Date.parse(e.createdAt) : Number(e.createdAt),
    }));
  },
  async fetchTransactionMessages(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    const rows = await apiRequest<ApiTransactionMessage[]>(`/transactions/${id}/messages`);
    return (rows || []).map((m) => ({
      ...m,
      createdAt: typeof m.createdAt === "string" ? Date.parse(m.createdAt) : Number(m.createdAt),
    }));
  },
  async sendTransactionMessage(id: string, text: string) {
    if (!state.session) throw new Error("Not authenticated");
    await apiRequest(`/transactions/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },
  async fetchReceipt(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    const receipt = await apiRequest<ApiReceipt>(`/transactions/${id}/receipt`);
    return {
      ...receipt,
      amount: typeof receipt.amount === "string" ? Number(receipt.amount) : receipt.amount,
      createdAt: typeof receipt.createdAt === "string" ? Date.parse(receipt.createdAt) : Number(receipt.createdAt),
      updatedAt: typeof (receipt.updatedAt ?? receipt.createdAt) === "string"
        ? Date.parse(receipt.updatedAt as any)
        : Number(receipt.updatedAt ?? receipt.createdAt),
    };
  },
  async listDeliveryProofs(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    const proofs = await apiRequest<ApiProof[]>(`/transactions/${id}/proofs`);
    return proofs.map((p) => ({
      ...p,
      createdAt: typeof p.createdAt === "string" ? Date.parse(p.createdAt) : Number(p.createdAt),
      url: `${apiBaseUrl()}/transactions/${id}/proofs/${p.id}/file`,
    }));
  },
  async uploadDeliveryProof(id: string, file: File, note?: string) {
    if (!state.session) throw new Error("Not authenticated");
    const form = new FormData();
    form.append("file", file);
    if (note) form.append("note", note);
    await apiUpload(`/transactions/${id}/proofs`, form);
  },
  async fetchDisputeByTransaction(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    return apiRequest<ApiDispute>(`/disputes/transaction/${id}`);
  },
  async uploadDisputeEvidence(disputeId: string, file: File, note?: string) {
    if (!state.session) throw new Error("Not authenticated");
    const form = new FormData();
    form.append("file", file);
    if (note) form.append("note", note);
    await apiUpload(`/disputes/${disputeId}/evidence`, form);
  },
  async addDisputeNote(disputeId: string, text: string, evidenceId?: string) {
    if (!state.session) throw new Error("Not authenticated");
    await apiRequest(`/disputes/${disputeId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, evidenceId }),
    });
  },
  async advanceTx(id: string, to: TxState) {
    if (!state.session) return;
    if (to === "SHIPPED") {
      const trackingId = `TRK-${Math.floor(Math.random() * 1_000_000)}`;
      await apiRequest(`/transactions/${id}/shipping`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingId }),
      });
      await store.refreshTransactions();
      return;
    }
    if (to === "DISPUTED") {
      await apiRequest(`/transactions/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await store.refreshTransactions();
      return;
    }
    await store.refreshTransactions();
  },
  async createTx(input: { sellerId: string; title: string; description: string; amount: number; category: string }) {
    if (!state.session) throw new Error("Not authenticated");
    const description = input.description ? `${input.title} — ${input.description}` : input.title;
    const created = await apiRequest<ApiTransaction>("/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId: input.sellerId, amount: input.amount, description }),
    });
    const tx = toClientTx(created);
    await store.refreshTransactions();
    return tx;
  },
  async initializeEscrowFunding(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    return apiRequest<{ authorization_url: string | null; reference: string }>(`/transactions/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },
  async verifyEscrowFunding(id: string, reference: string) {
    if (!state.session) throw new Error("Not authenticated");
    await apiRequest(`/transactions/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    await store.refreshTransactions();
  },
  async releaseFunds(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    await apiRequest(`/transactions/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    await store.refreshTransactions();
  },
  async adminStats() {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const [onboarding, disputes, settlement] = await Promise.all([
      apiRequest<ApiSellerOnboardingRequest[]>("/users/admin/seller-onboarding?status=PENDING").then((v) => v.length),
      apiRequest<ApiAdminDisputeListItem[]>("/disputes/admin?status=OPEN").then((v) => v.length),
      apiRequest<ApiAdminTransactionListItem[]>("/transactions/admin?status=SETTLEMENT_PENDING").then((v) => v.length),
    ]);
    return { onboarding, disputes, settlement };
  },
  async adminListSellerOnboarding(status?: ApiSellerOnboardingStatus) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiRequest<ApiSellerOnboardingRequest[]>(`/users/admin/seller-onboarding${qs}`);
  },
  async adminApproveSellerOnboarding(id: string, note?: string) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    return apiRequest(`/users/admin/seller-onboarding/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || "" }),
    });
  },
  async adminRejectSellerOnboarding(id: string, note?: string) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    return apiRequest(`/users/admin/seller-onboarding/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || "" }),
    });
  },
  async adminListDisputes(status?: "OPEN" | "CLOSED") {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiRequest<ApiAdminDisputeListItem[]>(`/disputes/admin${qs}`);
  },
  async adminGetDispute(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    return apiRequest<ApiAdminDispute>(`/disputes/admin/${id}`);
  },
  async adminResolveDispute(input: {
    disputeId: string;
    outcome: "refund" | "partial_refund" | "release" | "reject";
    justification: string;
    refundAmountMinor?: number;
    currency?: string;
    idempotencyKey?: string;
  }) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (input.idempotencyKey) headers["idempotency-key"] = input.idempotencyKey;
    return apiRequest(`/disputes/${input.disputeId}/admin/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        outcome: input.outcome,
        justification: input.justification,
        refundAmountMinor: input.refundAmountMinor,
        currency: input.currency,
      }),
    });
  },
  async adminListTransactions(input?: { q?: string; status?: "SETTLEMENT_PENDING" | "ALL" }) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const q = input?.q ? String(input.q) : "";
    const status = input?.status ? String(input.status) : "";
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiRequest<ApiAdminTransactionListItem[]>(`/transactions/admin${suffix}`);
  },
  async adminGetTransaction(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    return apiRequest<ApiAdminTransactionListItem>(`/transactions/admin/${id}`);
  },
  async adminGetTransactionLedger(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    return apiRequest<ApiLedgerEntry[]>(`/transactions/admin/${id}/ledger`);
  },
  async adminGetTransactionMessages(id: string) {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const rows = await apiRequest<ApiTransactionMessage[]>(`/transactions/admin/${id}/messages`);
    return (rows || []).map((m) => ({
      ...m,
      createdAt: typeof m.createdAt === "string" ? Date.parse(m.createdAt) : Number(m.createdAt),
    }));
  },
  async adminRetrySettlement(id: string, kind: "payout" | "refund" | "verify") {
    if (!state.session) throw new Error("Not authenticated");
    if (state.session.role !== "admin") throw new Error("Not authorized");
    const endpoint =
      kind === "payout"
        ? `/transactions/admin/${id}/retry-payout`
        : kind === "refund"
          ? `/transactions/admin/${id}/retry-refund`
          : `/transactions/admin/${id}/reconcile`;
    return apiRequest(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },
  markAllRead() {
    state = { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    persist();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  const snapshot = useSyncExternalStore(store.subscribe, store.get, () => initial);
  return selector(snapshot);
}

export function formatNGN(n: unknown): string {
  const num = typeof n === "number" ? n : typeof n === "string" ? Number(n) : 0;
  const safe = Number.isFinite(num) ? num : 0;
  return "₦" + safe.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const TX_FLOW: TxState[] = ["CREATED", "FUNDED", "SHIPPED", "DELIVERED", "RELEASE_PENDING", "RELEASED"];

export function stateColor(s: TxState): string {
  switch (s) {
    case "CREATED": return "bg-muted text-muted-foreground";
    case "FUNDED": return "bg-accent text-accent-foreground";
    case "SHIPPED": return "bg-secondary/20 text-secondary-foreground";
    case "DELIVERED": return "bg-warning/20 text-warning-foreground";
    case "RELEASE_PENDING": return "bg-warning/15 text-warning";
    case "RELEASED": return "bg-success/20 text-success";
    case "DISPUTED": return "bg-destructive/15 text-destructive";
    case "REFUND_PENDING": return "bg-warning/15 text-warning";
    case "REFUNDED": return "bg-muted text-muted-foreground";
  }
}
