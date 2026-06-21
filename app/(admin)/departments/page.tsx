"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Building2, RefreshCw, X, Loader2, AlertTriangle, Pencil } from "lucide-react";
import api from "@/lib/api";
import type { Department } from "@/types/api";
import { formatDate } from "@/lib/utils";

interface DepartmentFormInput {
    name: string;
    site: string;
}

// ── Form modal — satu komponen, dua mode (create / edit) ───────────────────────
// Mode ditentukan oleh ada-tidaknya prop `department`: undefined → create,
// terisi → edit (form di-prefill dari data departemen tersebut).

function DepartmentFormModal({
    department,
    onClose,
    onSaved,
}: {
    department?: Department;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!department;

    const [form, setForm] = useState<DepartmentFormInput>({
        name: department?.name ?? "",
        site: department?.site ?? "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (k: keyof DepartmentFormInput, v: string) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => ({ ...p, [k]: "" }));
    };

    const submit = async () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "Name is required";
        if (Object.keys(errs).length) return setErrors(errs);

        setLoading(true);
        setError(null);
        try {
            if (isEdit) {
                await api.patch(`/departments/${department.id}`, form);
            } else {
                await api.post("/departments", form);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error ?? `Failed to ${isEdit ? "update" : "create"} department`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-800">
                        {isEdit ? "Edit Department" : "New Department"}
                    </p>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Name *</label>
                        <input
                            type="text"
                            placeholder="e.g. Safety & Security"
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                errors.name ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-slate-400"
                            }`}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">
                            Site <span className="text-slate-300">· optional</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Jakarta HQ"
                            value={form.site}
                            onChange={(e) => set("site", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={loading}
                        className="flex-1 py-2.5 text-xs text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {isEdit ? "Save Changes" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // null = modal tertutup, undefined = modal terbuka mode create,
    // Department = modal terbuka mode edit untuk departemen tersebut
    const [formTarget, setFormTarget] = useState<Department | undefined | null>(null);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<Department[]>("/departments");
            setDepartments(res.data);
        } catch {
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    return (
        <div className="px-6 py-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-slate-800">Departments</h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {loading ? "Loading..." : `${departments.length} department${departments.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchDepartments}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setFormTarget(undefined)}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Department
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Name</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-40">Site</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-20">Status</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-36">Created</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-16">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-slate-50">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="h-3.5 bg-slate-100 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : departments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Building2 className="w-8 h-8 text-slate-300" />
                                        <p className="text-sm">No departments yet</p>
                                        <p className="text-xs">Create one to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            departments.map((dept) => (
                                <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                                <Building2 className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-sm text-slate-700 font-medium">{dept.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{dept.site || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                            dept.is_active
                                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                : "text-slate-500 bg-slate-50 border-slate-200"
                                        }`}>
                                            {dept.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(dept.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setFormTarget(dept)}
                                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {formTarget !== null && (
                <DepartmentFormModal
                    department={formTarget}
                    onClose={() => setFormTarget(null)}
                    onSaved={fetchDepartments}
                />
            )}
        </div>
    );
}