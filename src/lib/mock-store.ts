// In-memory + localStorage mock store for TrustyTrade
import { useSyncExternalStore } from "react";

export type Role = "buyer" | "seller";

export type TxState =
  | "CREATED"
  | "FUNDED"
  | "SHIPPED"
  | "DELIVERED"
  | "RELEASED"
  | "DISPUTED"
  | "REFUNDED";

export interface Seller {
  id: string;
  name: string;
  handle: string;
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
  email: string;
  name: string;
  role: Role;
}

interface State {
  session: Session | null;
  walletBalance: number;
  escrowLocked: number;
  earningsAvailable: number;
  transactions: Transaction[];
  sellers: Seller[];
  notifications: Notification[];
}

const SELLERS: Seller[] = [
  { id: "s_1", name: "Adaeze Okafor", handle: "@adaeze.luxe", avatar: "AO", rating: 4.9, reviews: 312, category: "Fashion & Apparel", verified: true, completedDeals: 287, bio: "Premium designer pieces sourced directly from Lagos boutiques." },
  { id: "s_2", name: "Tunde Bakare", handle: "@tundetech", avatar: "TB", rating: 4.8, reviews: 198, category: "Electronics", verified: true, completedDeals: 174, bio: "UK-used MacBooks, iPhones and accessories. Same-day delivery in Lagos." },
  { id: "s_3", name: "Chiamaka Eze", handle: "@chiamaka.beauty", avatar: "CE", rating: 4.7, reviews: 145, category: "Beauty & Skincare", verified: true, completedDeals: 132, bio: "Authentic luxury fragrances and skincare. No knockoffs, ever." },
  { id: "s_4", name: "Femi Adeyemi", handle: "@femi.kicks", avatar: "FA", rating: 4.9, reviews: 421, category: "Sneakers", verified: true, completedDeals: 389, bio: "Authenticated sneakers. Jordans, Yeezys, Nikes — all legit." },
  { id: "s_5", name: "Ngozi Williams", handle: "@ngozi.home", avatar: "NW", rating: 4.6, reviews: 89, category: "Home & Living", verified: false, completedDeals: 76, bio: "Curated home décor and furniture from across West Africa." },
  { id: "s_6", name: "Kelechi Obi", handle: "@kelechi.autos", avatar: "KO", rating: 4.8, reviews: 234, category: "Auto Parts", verified: true, completedDeals: 201, bio: "OEM auto parts for Toyota, Honda, Lexus. Verified suppliers." },
];

const initial: State = {
  session: null,
  walletBalance: 245_000,
  escrowLocked: 85_000,
  earningsAvailable: 412_500,
  transactions: [
    { id: "tx_001", reference: "TT-9X2KQ4", title: "MacBook Pro 14\" M3", description: "Space Black, 18GB RAM, 512GB SSD", amount: 1_850_000, buyerName: "You", sellerId: "s_2", sellerName: "Tunde Bakare", state: "SHIPPED", createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 3600000, category: "Electronics" },
    { id: "tx_002", reference: "TT-4P8M2L", title: "Air Jordan 4 Retro", description: "Size 43, Bred Reimagined, deadstock", amount: 285_000, buyerName: "You", sellerId: "s_4", sellerName: "Femi Adeyemi", state: "FUNDED", createdAt: Date.now() - 86400000, updatedAt: Date.now() - 7200000, category: "Sneakers" },
    { id: "tx_003", reference: "TT-7N3RB9", title: "Ankara Two-Piece Set", description: "Custom tailored, size M", amount: 65_000, buyerName: "You", sellerId: "s_1", sellerName: "Adaeze Okafor", state: "DELIVERED", createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000, category: "Fashion" },
    { id: "tx_004", reference: "TT-2H6VC1", title: "Tom Ford Oud Wood 100ml", description: "Authentic, sealed in original box", amount: 195_000, buyerName: "You", sellerId: "s_3", sellerName: "Chiamaka Eze", state: "RELEASED", createdAt: Date.now() - 86400000 * 12, updatedAt: Date.now() - 86400000 * 10, category: "Beauty" },
    { id: "tx_005", reference: "TT-5J1WT8", title: "Toyota Camry Brake Pads", description: "OEM, 2018-2022 models", amount: 42_000, buyerName: "You", sellerId: "s_6", sellerName: "Kelechi Obi", state: "DISPUTED", createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 1, category: "Auto" },
    { id: "tx_006", reference: "TT-8L4ZP2", title: "Yeezy Boost 350 V2", description: "Size 44, Zebra colorway", amount: 320_000, buyerName: "You", sellerId: "s_4", sellerName: "Femi Adeyemi", state: "CREATED", createdAt: Date.now() - 3600000, updatedAt: Date.now() - 3600000, category: "Sneakers" },
  ],
  sellers: SELLERS,
  notifications: [
    { id: "n_1", title: "Payment received", body: "Buyer funded escrow for MacBook Pro 14\" M3", createdAt: Date.now() - 3600000, read: false },
    { id: "n_2", title: "Item shipped", body: "Tunde Bakare marked your order as shipped", createdAt: Date.now() - 7200000, read: false },
    { id: "n_3", title: "Funds released", body: "₦195,000 released to Chiamaka Eze", createdAt: Date.now() - 86400000, read: true },
  ],
};

const STORAGE_KEY = "trustytrade_state_v1";

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw), sellers: SELLERS };
  } catch {
    return initial;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }
  listeners.forEach((l) => l());
}

export const store = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get(): State { return state; },
  setSession(s: Session | null) { state = { ...state, session: s }; persist(); },
  setRole(role: Role) {
    state = { ...state, session: state.session ? { ...state.session, role } : { email: "guest@trustytrade.app", name: "Guest", role } };
    persist();
  },
  signOut() { state = { ...state, session: null }; persist(); },
  advanceTx(id: string, to: TxState) {
    state = {
      ...state,
      transactions: state.transactions.map((t) => t.id === id ? { ...t, state: to, updatedAt: Date.now() } : t),
    };
    persist();
  },
  createTx(input: { sellerId: string; title: string; description: string; amount: number; category: string }) {
    const seller = state.sellers.find((s) => s.id === input.sellerId)!;
    const tx: Transaction = {
      id: `tx_${Math.random().toString(36).slice(2, 8)}`,
      reference: `TT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      title: input.title,
      description: input.description,
      amount: input.amount,
      buyerName: "You",
      sellerId: seller.id,
      sellerName: seller.name,
      state: "CREATED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: input.category,
    };
    state = { ...state, transactions: [tx, ...state.transactions] };
    persist();
    return tx;
  },
  fundEscrow(id: string) {
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;
    state = {
      ...state,
      walletBalance: Math.max(0, state.walletBalance - tx.amount),
      escrowLocked: state.escrowLocked + tx.amount,
      transactions: state.transactions.map((t) => t.id === id ? { ...t, state: "FUNDED", updatedAt: Date.now() } : t),
    };
    persist();
  },
  releaseFunds(id: string) {
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;
    state = {
      ...state,
      escrowLocked: Math.max(0, state.escrowLocked - tx.amount),
      transactions: state.transactions.map((t) => t.id === id ? { ...t, state: "RELEASED", updatedAt: Date.now() } : t),
    };
    persist();
  },
  withdraw(amount: number) {
    state = { ...state, earningsAvailable: Math.max(0, state.earningsAvailable - amount) };
    persist();
  },
  markAllRead() {
    state = { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    persist();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => selector(store.get()),
    () => selector(initial),
  );
}

export function formatNGN(n: number): string {
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
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

export const TX_FLOW: TxState[] = ["CREATED", "FUNDED", "SHIPPED", "DELIVERED", "RELEASED"];

export function stateColor(s: TxState): string {
  switch (s) {
    case "CREATED": return "bg-muted text-muted-foreground";
    case "FUNDED": return "bg-accent text-accent-foreground";
    case "SHIPPED": return "bg-secondary/20 text-secondary-foreground";
    case "DELIVERED": return "bg-warning/20 text-warning-foreground";
    case "RELEASED": return "bg-success/20 text-success";
    case "DISPUTED": return "bg-destructive/15 text-destructive";
    case "REFUNDED": return "bg-muted text-muted-foreground";
  }
}
