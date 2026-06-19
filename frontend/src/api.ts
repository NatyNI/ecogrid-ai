import type { DashboardResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchDashboard(): Promise<DashboardResponse> {
  const response = await fetch(`${API_BASE}/api/dashboard`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to load dashboard data");
  }
  return response.json() as Promise<DashboardResponse>;
}
