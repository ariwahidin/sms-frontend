"use client";

import { useEffect, useState } from "react";
import {
  FileWarning,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import type { DashboardStats, ReportStatus } from "@/types/api";
import { cn, formatDateShort } from "@/lib/utils";

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-start gap-3">
      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs">{label}</p>
        <p className="text-slate-800 text-xl font-semibold leading-tight mt-0.5">
          {value}
        </p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Status Row ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; bar: string }
> = {
  declaration: {
    label: "Declaration",
    color: "text-blue-600",
    bar: "bg-blue-400",
  },
  classification: {
    label: "Classification",
    color: "text-amber-600",
    bar: "bg-amber-400",
  },
  investigation: {
    label: "Investigation",
    color: "text-purple-600",
    bar: "bg-purple-400",
  },
  approval: {
    label: "Approval",
    color: "text-orange-600",
    bar: "bg-orange-400",
  },
  closed: {
    label: "Closed",
    color: "text-green-600",
    bar: "bg-green-400",
  },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<DashboardStats>("/dashboard");
      setStats(res.data);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const total = stats?.total ?? 0;
  const overdue = stats?.overdue ?? 0;
  const closed = stats?.by_status?.closed ?? 0;
  const active = total - closed;

  return (
    <div className="px-6 py-5 space-y-5 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800">Dashboard</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Overview · {formatDateShort(new Date().toISOString())}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Reports"
          value={loading ? "—" : total}
          icon={FileWarning}
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Active"
          value={loading ? "—" : active}
          icon={TrendingUp}
          accent="bg-blue-50 text-blue-600"
          sub="In progress"
        />
        <StatCard
          label="Overdue"
          value={loading ? "—" : overdue}
          icon={AlertTriangle}
          accent={overdue > 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}
        />
        <StatCard
          label="Closed"
          value={loading ? "—" : closed}
          icon={CheckCircle2}
          accent="bg-green-50 text-green-600"
          sub="Resolved"
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By status */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-slate-700 mb-4">Reports by Status</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((status) => {
                const count = stats?.by_status?.[status] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-medium", cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {count} <span className="text-slate-300">·</span> {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", cfg.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By risk level */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-slate-700 mb-4">Reports by Risk Level</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(
                [
                  {
                    key: "high",
                    label: "High Risk",
                    color: "bg-red-50 border-red-200",
                    text: "text-red-700",
                    dot: "bg-red-400",
                  },
                  {
                    key: "medium",
                    label: "Medium Risk",
                    color: "bg-amber-50 border-amber-200",
                    text: "text-amber-700",
                    dot: "bg-amber-400",
                  },
                  {
                    key: "low",
                    label: "Low Risk",
                    color: "bg-slate-50 border-slate-200",
                    text: "text-slate-600",
                    dot: "bg-slate-400",
                  },
                ] as const
              ).map(({ key, label, color, text, dot }) => {
                const count = stats?.by_risk?.[key] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-md border",
                      color
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", dot)} />
                      <span className={cn("text-xs font-medium", text)}>
                        {label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-sm font-semibold", text)}>
                        {count}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}

              {total === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No reports yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-slate-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <a
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 text-white text-xs hover:bg-slate-700 transition-colors"
          >
            <FileWarning className="w-3.5 h-3.5" />
            View all reports
          </a>
          <a
            href="/reports?status=declaration"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs hover:bg-blue-100 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Pending declaration ({stats?.by_status?.declaration ?? 0})
          </a>
          <a
            href="/reports?status=investigation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs hover:bg-purple-100 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs investigation ({stats?.by_status?.investigation ?? 0})
          </a>
        </div>
      </div>
    </div>
  );
}
