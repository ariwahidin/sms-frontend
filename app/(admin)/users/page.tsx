"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Users, RefreshCw, X, Loader2, AlertTriangle, Pencil } from "lucide-react";
import api from "@/lib/api";
import type { User, Department } from "@/types/api";
import { formatDate } from "@/lib/utils";

const ROLES = ["admin", "pic", "hod"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", pic: "PIC", hod: "HOD" };
const ROLE_COLOR: Record<Role, string> = {
    admin: "text-purple-700 bg-purple-50 border-purple-200",
    pic: "text-blue-700 bg-blue-50 border-blue-200",
    hod: "text-amber-700 bg-amber-50 border-amber-200",
};

// ── Shared form fields ────────────────────────────────────────────────────────

function DeptSelect({ value, onChange, departments }: {
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    departments: Department[];
}) {
    return (
        <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
        >
            <option value="">Pilih departemen...</option>
            {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.site ? ` · ${d.site}` : ""}</option>
            ))}
        </select>
    );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateInput {
    username: string;
    password: string;
    name: string;
    email: string;
    role: Role;
    department_id?: number;
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState<CreateInput>({ username: "", password: "", name: "", email: "", role: "pic" });
    const [departments, setDepartments] = useState<Department[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get<Department[]>("/departments").then((r) => setDepartments(r.data)).catch(() => {});
    }, []);

    const set = (k: keyof CreateInput, v: string | number | undefined) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => ({ ...p, [k]: "" }));
    };

    const submit = async () => {
        const errs: Record<string, string> = {};
        if (!form.username.trim()) errs.username = "Username wajib diisi";
        if (!form.password.trim()) errs.password = "Password wajib diisi";
        if (!form.name.trim()) errs.name = "Nama wajib diisi";
        if (Object.keys(errs).length) return setErrors(errs);
        setLoading(true);
        setError(null);
        try {
            await api.post("/users", form);
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error ?? "Gagal membuat user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-800">New User</p>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3">
                    {[
                        { key: "username", label: "Username *", placeholder: "e.g. john.doe", type: "text" },
                        { key: "password", label: "Password *", placeholder: "Min. 8 karakter", type: "password" },
                        { key: "name", label: "Nama *", placeholder: "e.g. John Doe", type: "text" },
                        { key: "email", label: "Email", placeholder: "e.g. john@company.com", type: "email" },
                    ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                            <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                            <input
                                type={type}
                                placeholder={placeholder}
                                value={(form as any)[key]}
                                onChange={(e) => set(key as keyof CreateInput, e.target.value)}
                                className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                    errors[key] ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-slate-400"
                                }`}
                            />
                            {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                        </div>
                    ))}

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Role *</label>
                        <select value={form.role} onChange={(e) => set("role", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors">
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Departemen <span className="text-slate-300">· opsional</span></label>
                        <DeptSelect value={form.department_id} onChange={(v) => set("department_id", v)} departments={departments} />
                    </div>
                </div>

                {error && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 py-2.5 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={submit} disabled={loading} className="flex-1 py-2.5 text-xs text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface UpdateInput {
    name: string;
    email: string;
    role: Role;
    department_id?: number;
    is_active: boolean;
    password: string;
}

function EditModal({ user, onClose, onUpdated }: { user: User; onClose: () => void; onUpdated: () => void }) {
    const [form, setForm] = useState<UpdateInput>({
        name: user.name,
        email: user.email ?? "",
        role: user.role as Role,
        department_id: user.department_id ?? undefined,
        is_active: user.is_active,
        password: "",
    });
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get<Department[]>("/departments").then((r) => setDepartments(r.data)).catch(() => {});
    }, []);

    const set = (k: keyof UpdateInput, v: string | number | boolean | undefined) =>
        setForm((p) => ({ ...p, [k]: v }));

    const submit = async () => {
        if (!form.name.trim()) return setError("Nama wajib diisi");
        setLoading(true);
        setError(null);
        try {
            await api.patch(`/users/${user.id}`, {
                ...form,
                password: form.password || undefined, // kosong = tidak kirim
            });
            onUpdated();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error ?? "Gagal mengupdate user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Edit User</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{user.username}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Nama *</label>
                        <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Email <span className="text-slate-300">· opsional</span></label>
                        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Password <span className="text-slate-300">· kosong = tidak diubah</span></label>
                        <input type="password" value={form.password} placeholder="Isi untuk ganti password"
                            onChange={(e) => set("password", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Role *</label>
                        <select value={form.role} onChange={(e) => set("role", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors">
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Departemen <span className="text-slate-300">· opsional</span></label>
                        <DeptSelect value={form.department_id} onChange={(v) => set("department_id", v)} departments={departments} />
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <label className="text-xs text-slate-500">Status Aktif</label>
                        <button
                            onClick={() => set("is_active", !form.is_active)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${form.is_active ? "bg-slate-800" : "bg-slate-200"}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 py-2.5 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={submit} disabled={loading} className="flex-1 py-2.5 text-xs text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<User[]>("/users");
            setUsers(res.data);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    return (
        <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-slate-800">Users</h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {loading ? "Loading..." : `${users.length} user${users.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchUsers} disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        New User
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Nama</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-32">Username</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-40">Email</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-24">Role</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-36">Departemen</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-20">Status</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-36">Dibuat</th>
                            <th className="w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-slate-50">
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-3.5 bg-slate-100 rounded animate-pulse" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Users className="w-8 h-8 text-slate-300" />
                                        <p className="text-sm">Belum ada user</p>
                                        <p className="text-xs">Buat user pertama untuk memulai</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-semibold text-slate-500">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm text-slate-700 font-medium">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{user.username}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{user.email || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_COLOR[user.role as Role]}`}>
                                            {ROLE_LABEL[user.role as Role] ?? user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{user.department?.name ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                            user.is_active ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200"
                                        }`}>
                                            {user.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(user.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setEditUser(user)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchUsers} />}
            {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} onUpdated={fetchUsers} />}
        </div>
    );
}