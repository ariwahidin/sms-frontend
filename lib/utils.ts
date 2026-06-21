import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import type { ReportStatus, RiskLevel, Priority } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy, HH:mm");
  } catch {
    return "-";
  }
}

export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

// ── File size ─────────────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Label maps ────────────────────────────────────────────────────────────────
export const STATUS_LABEL: Record<ReportStatus, string> = {
  declaration: "Declaration",
  classification: "Classification",
  investigation: "Investigation",
  approval: "Approval",
  closed: "Closed",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// ── Color maps (Tailwind classes) ─────────────────────────────────────────────
export const STATUS_COLOR: Record<ReportStatus, string> = {
  declaration: "bg-blue-50 text-blue-700 border-blue-200",
  classification: "bg-amber-50 text-amber-700 border-amber-200",
  investigation: "bg-purple-50 text-purple-700 border-purple-200",
  approval: "bg-orange-50 text-orange-700 border-orange-200",
  closed: "bg-green-50 text-green-700 border-green-200",
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};
