/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Search,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import type {
    RiskReport,
    PaginatedResponse,
    ReportFilters,
    ReportStatus,
    RiskLevel,
} from "@/types/api";
import {
    cn,
    formatDate,
    STATUS_LABEL,
    STATUS_COLOR,
    RISK_LABEL,
    RISK_COLOR,
} from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 25;

const STATUSES: { value: ReportStatus | ""; label: string }[] = [
    { value: "", label: "All status" },
    { value: "declaration", label: "Declaration" },
    { value: "classification", label: "Classification" },
    { value: "investigation", label: "Investigation" },
    { value: "approval", label: "Approval" },
    { value: "closed", label: "Closed" },
];

const RISKS: { value: RiskLevel | ""; label: string }[] = [
    { value: "", label: "All risk" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

export default function ReportsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [reports, setReports] = useState<RiskReport[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState<ReportFilters>({
        status: (searchParams.get("status") as ReportStatus) || "",
        risk_level: "",
        site: "",
        page: 1,
        page_size: PAGE_SIZE,
    });

    const fetchReports = useCallback(async (f: ReportFilters) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (f.status) params.status = f.status;
            if (f.risk_level) params.risk_level = f.risk_level;
            if (f.site) params.site = f.site;
            if (f.date_from) params.date_from = f.date_from;
            if (f.date_to) params.date_to = f.date_to;
            params.page = String(f.page ?? 1);
            params.page_size = String(f.page_size ?? PAGE_SIZE);

            const res = await api.get<PaginatedResponse<RiskReport>>("/reports", {
                params,
            });
            setReports(res.data.data);
            setTotal(res.data.total);
            setPages(res.data.pages);
        } catch {
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports(filters);
    }, [filters, fetchReports]);

    const updateFilter = (key: keyof ReportFilters, value: string | number) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    return (
        <div className="flex h-full">
            <div className="flex-1 flex flex-col min-w-0 px-6 py-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-slate-800">Reports</h1>
                        <p className="text-slate-400 text-xs mt-0.5">
                            {loading ? "Loading..." : `${total} report${total !== 1 ? "s" : ""} found`}
                        </p>
                    </div>
                    <button
                        onClick={() => fetchReports(filters)}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            placeholder="Search site..."
                            value={filters.site ?? ""}
                            onChange={(e) => updateFilter("site", e.target.value)}
                            className="pl-8 h-8 text-xs w-36"
                        />
                    </div>

                    <Select
                        value={filters.status ?? ""}
                        onValueChange={(v) => updateFilter("status", v)}
                    >
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.risk_level ?? ""}
                        onValueChange={(v) => updateFilter("risk_level", v)}
                    >
                        <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RISKS.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="text-xs">
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        type="date"
                        value={filters.date_from ?? ""}
                        onChange={(e) => updateFilter("date_from", e.target.value)}
                        className="h-8 text-xs w-36"
                    />
                    <Input
                        type="date"
                        value={filters.date_to ?? ""}
                        onChange={(e) => updateFilter("date_to", e.target.value)}
                        className="h-8 text-xs w-36"
                    />

                    {(filters.status || filters.risk_level || filters.site || filters.date_from) && (
                        <button
                            onClick={() =>
                                setFilters({ status: "", risk_level: "", site: "", page: 1, page_size: PAGE_SIZE })
                            }
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                            <Filter className="w-3 h-3" /> Clear
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-28">
                                        Code
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">
                                        Description
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-24">
                                        Status
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-20">
                                        Risk
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-32">
                                        Location
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-36">
                                        Reported
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-8">
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-50">
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-3.5 bg-slate-100 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <AlertTriangle className="w-8 h-8 text-slate-300" />
                                                <p className="text-sm">No reports found</p>
                                                <p className="text-xs">Try adjusting your filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    reports.map((report) => (
                                        <tr
                                            key={report.id}
                                            onClick={() => router.push(`/reports/${report.id}`)}
                                            className="border-b border-slate-50 cursor-pointer transition-colors group hover:bg-slate-50/70"
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    {report.is_overdue && (
                                                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                                    )}
                                                    <span className="font-mono text-xs text-slate-600 font-medium">
                                                        {report.code}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                                                    {report.description}
                                                </p>
                                                {report.reporter_name && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        by {report.reporter_name}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        STATUS_COLOR[report.status]
                                                    )}
                                                >
                                                    {STATUS_LABEL[report.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        RISK_COLOR[report.risk_level]
                                                    )}
                                                >
                                                    {RISK_LABEL[report.risk_level]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <p className="text-xs text-slate-600 truncate">
                                                    {report.location?.area_name ?? "—"}
                                                </p>
                                                {report.location?.site && (
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {report.location.site}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-400">
                                                {formatDate(report.created_at)}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pages > 1 && (
                        <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-white">
                            <p className="text-xs text-slate-400">
                                Page {filters.page} of {pages} · {total} total
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => updateFilter("page", (filters.page ?? 1) - 1)}
                                    disabled={(filters.page ?? 1) <= 1}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                                <button
                                    onClick={() => updateFilter("page", (filters.page ?? 1) + 1)}
                                    disabled={(filters.page ?? 1) >= pages}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}