"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import api from "@/lib/api";
import { cn, formatDateShort } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawDashboard {
  total: number;
  overdue: number;
  on_track: number;
  off_track: number;
  by_status: Record<string, number>;
  by_risk: Record<string, number>;
  by_site: { Site: string; Count: number }[];
  by_department: { Name: string; Count: number }[];
  monthly: { Month: number; RiskLevel: string; Count: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  declaration: "#378ADD",
  classification: "#BA7517",
  investigation: "#7F77DD",
  approval: "#D85A30",
  closed: "#1D9E75",
};

const STATUS_LABELS: Record<string, string> = {
  declaration: "Declaration",
  classification: "Classification",
  investigation: "Investigation",
  approval: "Approval",
  closed: "Closed",
};

const SITE_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#7F77DD", "#BA7517", "#D85A30"];
const DEPT_COLORS = ["#378ADD", "#7F77DD", "#1D9E75", "#BA7517", "#E24B4A", "#D85A30"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accentColor,
  sub,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accentColor: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
      />
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2"
        style={{ background: accentColor + "18" }}
      >
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-500 text-xs">{label}</p>
        {loading ? (
          <div className="h-7 w-12 bg-slate-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-slate-800 text-2xl font-semibold leading-tight mt-0.5">
            {value}
          </p>
        )}
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Pie Chart Card ────────────────────────────────────────────────────────────
function PieCard({
  title,
  data,
  colors,
  loading,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
  loading?: boolean;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 mb-3">{title}</p>
      {loading ? (
        <div className="h-[120px] bg-slate-100 rounded-lg animate-pulse" />
      ) : total === 0 ? (
        <div className="h-[120px] flex items-center justify-center text-slate-400 text-xs">
          No data
        </div>
      ) : (
        <>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={54}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const v = Number(value);
                    return [
                      `${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`,
                      String(name),
                    ];
                  }}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 6,
                    border: "0.5px solid #e2e8f0",
                    boxShadow: "none",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="text-[10px] text-slate-600 truncate max-w-[80px]">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {item.value} · {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Custom Bar Tooltip ─────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a: number, p: any) => a + (p.value || 0), 0);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs shadow-sm">
      <p className="font-medium text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-700">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex justify-between">
        <span className="text-slate-400">Total</span>
        <span className="font-medium text-slate-700">{total}</span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<RawDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<RawDashboard>("/dashboard");
      setData(res.data);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const total = data?.total ?? 0;
  const closed = data?.by_status?.closed ?? 0;
  const active = total - closed;
  const overdue = data?.overdue ?? 0;

  const statusPieData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: data?.by_status?.[key] ?? 0,
  }));
  const statusColors = Object.keys(STATUS_LABELS).map((k) => STATUS_COLORS[k]);

  const sitePieData = (data?.by_site ?? []).map((s) => ({
    name: s.Site,
    value: s.Count,
  }));

  const deptPieData = (data?.by_department ?? []).map((d) => ({
    name: d.Name,
    value: d.Count,
  }));

  const trackingPieData = [
    { name: "Off track", value: data?.off_track ?? 0 },
    { name: "On track", value: data?.on_track ?? 0 },
  ];

  // Monthly bar — build 12-month array
  const monthlyBar = MONTHS.map((month, i) => {
    const rows = (data?.monthly ?? []).filter((m) => m.Month === i + 1);
    return {
      month,
      High: rows.find((r) => r.RiskLevel === "high")?.Count ?? 0,
      Medium: rows.find((r) => r.RiskLevel === "medium")?.Count ?? 0,
      Low: rows.find((r) => r.RiskLevel === "low")?.Count ?? 0,
    };
  });

  return (
    <div className="px-6 py-5 space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800">Dashboard</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Safety Risk Reporting · {formatDateShort(new Date().toISOString())}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total reports" value={total} icon={FileWarning} accentColor="#378ADD" sub="All time" loading={loading} />
        <StatCard label="Closed" value={closed} icon={CheckCircle2} accentColor="#1D9E75" sub="Resolved" loading={loading} />
        <StatCard label="Active" value={active} icon={TrendingUp} accentColor="#BA7517" sub="In progress" loading={loading} />
        <StatCard label="Overdue" value={overdue} icon={AlertTriangle} accentColor={overdue > 0 ? "#E24B4A" : "#94A3B8"} sub="Off track" loading={loading} />
      </div>

      {/* 4 Pie charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PieCard title="Processing status" data={statusPieData} colors={statusColors} loading={loading} />
        <PieCard title="Site" data={sitePieData} colors={SITE_COLORS} loading={loading} />
        <PieCard title="Division" data={deptPieData} colors={DEPT_COLORS} loading={loading} />
        <PieCard
          title="Risk handling"
          data={trackingPieData}
          colors={["#E24B4A", "#1D9E75"]}
          loading={loading}
        />
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500 mb-4">Monthly statistics</p>
        {loading ? (
          <div className="h-[200px] bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyBar} barSize={16} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 12 }}
              />
              <Bar dataKey="High" stackId="a" fill="#E24B4A" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Medium" stackId="a" fill="#BA7517" />
              <Bar dataKey="Low" stackId="a" fill="#1D9E75" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500 mb-3">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs hover:bg-slate-700 transition-colors"
          >
            <FileWarning className="w-3.5 h-3.5" />
            View all reports
          </a>
          <a
            href="/reports?status=declaration"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs hover:bg-blue-100 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Pending declaration ({data?.by_status?.declaration ?? 0})
          </a>
          <a
            href="/reports?status=classification"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs classification ({data?.by_status?.classification ?? 0})
          </a>
          <a
            href="/reports?status=investigation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs hover:bg-purple-100 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Needs investigation ({data?.by_status?.investigation ?? 0})
          </a>
          <a
            href="/reports?status=approval"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs hover:bg-orange-100 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Awaiting approval ({data?.by_status?.approval ?? 0})
          </a>
        </div>
      </div>
    </div>
  );
}