// Centralized API Endpoints according to AGENTS.md Mandatory Rules
// Base URL diambil dari api.js (VITE_API_URL || production URL)

import { API_BASE_URL } from "./api";

/**
 * Helper untuk resolve URL upload file (gambar armada dll)
 * Karena frontend & backend beda domain, path relatif perlu di-resolve
 * ke full URL backend.
 */
export const getUploadUrl = (relativePath) => {
  if (!relativePath) return null;
  // Jika sudah absolute URL, return as-is
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  // Jika data URL (base64), return as-is
  if (relativePath.startsWith("data:")) {
    return relativePath;
  }
  // Resolve path relatif ke base URL backend
  return `${API_BASE_URL}${relativePath}`;
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    PROFILE: "/api/auth/profile",
  },
  DASHBOARD: {
    STATS: "/api/dashboard/stats",
  },
  NOTIFICATIONS: {
    H2_REMINDERS: "/api/notifications/h2-reminders",
  },
  CLIENTS: {
    LIST: "/api/clients",
    ALL: "/api/clients/all",
    DETAIL: (id) => `/api/clients/${id}`,
    CREATE: "/api/clients",
    UPDATE: (id) => `/api/clients/${id}`,
    DELETE: (id) => `/api/clients/${id}`,
  },
  FLEETS: {
    LIST: "/api/fleets",
    ALL: "/api/fleets/all",
    DETAIL: (id) => `/api/fleets/${id}`,
    CREATE: "/api/fleets",
    UPDATE: (id) => `/api/fleets/${id}`,
    DELETE: (id) => `/api/fleets/${id}`,
  },
  RESERVATIONS: {
    LIST: "/api/reservations",
    DETAIL: (id) => `/api/reservations/${id}`,
    CREATE: "/api/reservations",
    UPDATE: (id) => `/api/reservations/${id}`,
    UPDATE_STATUS: (id) => `/api/reservations/${id}/status`,
    DELETE: (id) => `/api/reservations/${id}`,
  },
  INVOICES: {
    LIST: "/api/invoices",
    DETAIL: (id) => `/api/invoices/${id}`,
    CREATE: "/api/invoices",
    UPDATE: (id) => `/api/invoices/${id}`,
    MIDTRANS_TOKEN: (id) => `/api/invoices/${id}/midtrans-token`,
    MARK_PAID: (id) => `/api/invoices/${id}/mark-paid`,
  },
  RECEIPTS: {
    LIST: "/api/receipts",
    DETAIL: (id) => `/api/receipts/${id}`,
  },
  VERIFY: {
    CHECK: (type, code) => `/api/verify/${type}/${encodeURIComponent(code)}`,
  },
  COMPANY_PROFILE: {
    GET: "/api/company-profile",
    UPDATE: "/api/company-profile",
  }
};
