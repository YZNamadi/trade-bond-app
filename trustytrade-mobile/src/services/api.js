import { api } from "./apiClient";

export async function mobileLogin(input) {
  const res = await api.post("/auth/mobile/login", input);
  return res.data;
}

export async function mobileRegister(input) {
  const res = await api.post("/auth/mobile/register", input);
  return res.data;
}

export async function mobileRefresh(input) {
  const res = await api.post("/auth/mobile/refresh", input);
  return res.data;
}

export async function fetchProfile() {
  const res = await api.get("/auth/profile");
  return res.data;
}

export async function logout() {
  const res = await api.post("/auth/logout");
  return res.data;
}

export async function getMe() {
  const res = await api.get("/users/me");
  return res.data;
}

export async function updateProfile(input) {
  const res = await api.patch("/users/me/profile", input);
  return res.data;
}

export async function listBanks() {
  const res = await api.get("/users/banks");
  return res.data;
}

export async function getMyBankAccount() {
  const res = await api.get("/users/me/bank-account");
  return res.data;
}

export async function updateMyBankAccount(input) {
  const res = await api.patch("/users/me/bank-account", input);
  return res.data;
}

export async function applySeller(input) {
  const res = await api.post("/users/me/seller/apply", input);
  return res.data;
}

export async function getSellerByTrustyTag(tag) {
  const clean = String(tag || "").trim();
  const res = await api.get(`/users/trustytag/${encodeURIComponent(clean)}`);
  return res.data;
}

export async function listTransactions() {
  const res = await api.get("/transactions");
  return res.data;
}

export async function getTransaction(id) {
  const res = await api.get(`/transactions/${encodeURIComponent(id)}`);
  return res.data;
}

export async function listTransactionEvents(id) {
  const res = await api.get(`/transactions/${encodeURIComponent(id)}/events`);
  return res.data;
}

export async function listTransactionMessages(id) {
  const res = await api.get(`/transactions/${encodeURIComponent(id)}/messages`);
  return res.data;
}

export async function sendTransactionMessage(id, input) {
  const res = await api.post(`/transactions/${encodeURIComponent(id)}/messages`, input);
  return res.data;
}

export async function createTransaction(input) {
  const res = await api.post("/transactions", input);
  return res.data;
}

export async function initPayment(id) {
  const res = await api.post(`/transactions/${encodeURIComponent(id)}/pay`);
  return res.data;
}

export async function verifyPayment(id, input) {
  const res = await api.post(`/transactions/${encodeURIComponent(id)}/verify`, input);
  return res.data;
}

export async function confirmDelivery(id) {
  const res = await api.post(`/transactions/${encodeURIComponent(id)}/confirm`);
  return res.data;
}

export async function updateShipping(id, input) {
  const res = await api.patch(`/transactions/${encodeURIComponent(id)}/shipping`, input);
  return res.data;
}

export async function openDispute(id) {
  const res = await api.post(`/transactions/${encodeURIComponent(id)}/dispute`);
  return res.data;
}

export async function listProofs(id) {
  const res = await api.get(`/transactions/${encodeURIComponent(id)}/proofs`);
  return res.data;
}

export async function uploadProof(id, formData) {
  const res = await api.post(`/transactions/${encodeURIComponent(id)}/proofs`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getReceipt(id) {
  const res = await api.get(`/transactions/${encodeURIComponent(id)}/receipt`);
  return res.data;
}

export async function listDisputes() {
  const res = await api.get("/disputes");
  return res.data;
}

export async function getDispute(id) {
  const res = await api.get(`/disputes/${encodeURIComponent(id)}`);
  return res.data;
}

export async function getDisputeByTransaction(transactionId) {
  const res = await api.get(`/disputes/transaction/${encodeURIComponent(transactionId)}`);
  return res.data;
}

export async function addDisputeNote(id, input) {
  const res = await api.post(`/disputes/${encodeURIComponent(id)}/notes`, input);
  return res.data;
}

export async function submitDisputeEvidence(id, formData) {
  const res = await api.post(`/disputes/${encodeURIComponent(id)}/evidence`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
