"use client";

import { useEffect, useState } from "react";
import {
    X,
    ChevronRight,
    AlertTriangle,
    Clock,
    User,
    MapPin,
    Building2,
    Upload,
    Loader2,
    ImageIcon,
    Download,
    ZoomIn,
} from "lucide-react";
import api from "@/lib/api";
import type { RiskReport, ReportFile, ReportActivity } from "@/types/api";
import { cn, formatDate, STATUS_LABEL, STATUS_COLOR, RISK_LABEL, RISK_COLOR } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionType = "classify" | "investigate" | "approve" | "reject" | null;
type Tab = "overview" | "activities" | "files";

interface ClassifyBody {
    risk_level: string;
    priority: string;
    notes: string;
    pic_id?: number;
}
interface InvestigateBody {
    root_cause: string;
    countermeasures: string;
}
interface ApproveRejectBody {
    comment: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mime: string) {
    return mime.startsWith("image/");
}

/** URL untuk serve file lewat backend (auth-protected) */
// function fileUrl(reportId: number, fileId: number) {
//     return `/api/reports/${reportId}/files/${fileId}`;
// }

function fileUrl(reportId: number, fileId: number) {
    return `/reports/${reportId}/files/${fileId}`;
}

// ── SLA Badge ─────────────────────────────────────────────────────────────────

function SLABadge({ deadline, label }: { deadline?: string | null; label: string }) {
    if (!deadline) return null;
    const dl = new Date(deadline);
    const now = new Date();
    const overdue = dl < now;
    const hours = Math.abs(dl.getTime() - now.getTime()) / 36e5;
    return (
        <div className={cn(
            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border",
            overdue
                ? "text-red-600 bg-red-50 border-red-200"
                : hours < 2
                    ? "text-amber-600 bg-amber-50 border-amber-200"
                    : "text-slate-500 bg-slate-50 border-slate-200"
        )}>
            <Clock className="w-2.5 h-2.5" />
            {label}: {overdue ? "overdue" : formatDate(deadline)}
        </div>
    );
}

// ── Section / Field ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {title}
            </p>
            {children}
        </div>
    );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="mb-2">
            <p className="text-[10px] text-slate-400">{label}</p>
            <p className="text-xs text-slate-700 mt-0.5">{value || "—"}</p>
        </div>
    );
}

// ── Image Lightbox ────────────────────────────────────────────────────────────

function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
    // tutup dengan Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center"
            onClick={onClose}
        >
            {/* toolbar */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-xs text-white/70 truncate max-w-xs">{name}</p>
                <div className="flex items-center gap-2">
                    <a
                        href={src}
                        download={name}
                        className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download
                    </a>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors ml-2"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* gambar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={name}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// ── File Item ─────────────────────────────────────────────────────────────────

function FileCard({ file, reportId }: { file: ReportFile; reportId: number }) {
    const [lightbox, setLightbox] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [imgLoading, setImgLoading] = useState(true);
    const isImage = isImageMime(file.mime_type);

    useEffect(() => {
        if (!isImage) return;
        let cancelled = false;
        let blobUrl: string | null = null;
        api.get(fileUrl(reportId, file.id), { responseType: "blob" })
            .then((res) => {
                if (cancelled) return;
                blobUrl = URL.createObjectURL(res.data as Blob);
                setObjectUrl(blobUrl);
            })
            .catch(() => { if (!cancelled) setObjectUrl(null); })
            .finally(() => { if (!cancelled) setImgLoading(false); });
        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [file.id, reportId, isImage]);

    const handleDownload = async () => {
        try {
            const res = await api.get(fileUrl(reportId, file.id), { responseType: "blob" });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.file_name;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // silent
        }
    };

    return (
        <>
            <div className="rounded-xl border border-slate-100 overflow-hidden bg-white hover:border-slate-200 transition-colors">
                {/* thumbnail untuk gambar */}
                {isImage && (
                    <button
                        onClick={() => objectUrl && setLightbox(true)}
                        className="relative w-full aspect-video bg-slate-100 overflow-hidden group"
                        disabled={imgLoading || !objectUrl}
                    >
                        {imgLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                            </div>
                        )}
                        {objectUrl && (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={objectUrl}
                                    alt={file.file_name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                </div>
                            </>
                        )}
                        {!imgLoading && !objectUrl && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-slate-300" />
                            </div>
                        )}
                    </button>
                )}

                {/* info baris bawah */}
                <div className="flex items-center gap-2.5 px-3 py-2">
                    {!isImage && (
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 truncate">{file.file_name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(file.file_size)}</p>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        title="Download"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {lightbox && objectUrl && (
                <Lightbox
                    src={objectUrl}
                    name={file.file_name}
                    onClose={() => setLightbox(false)}
                />
            )}
        </>
    );
}

// function FileCard({ file, reportId }: { file: ReportFile; reportId: number }) {
//     const [lightbox, setLightbox] = useState(false);
//     const isImage = isImageMime(file.mime_type);
//     const url = fileUrl(reportId, file.id);

//     return (
//         <>
//             <div className="rounded-xl border border-slate-100 overflow-hidden bg-white hover:border-slate-200 transition-colors">
//                 {/* thumbnail untuk gambar */}
//                 {isImage && (
//                     <button
//                         onClick={() => setLightbox(true)}
//                         className="relative w-full aspect-video bg-slate-50 overflow-hidden group"
//                     >
//                         {/* eslint-disable-next-line @next/next/no-img-element */}
//                         <img
//                             src={url}
//                             alt={file.file_name}
//                             className="w-full h-full object-cover"
//                         />
//                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
//                             <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
//                         </div>
//                     </button>
//                 )}

//                 {/* info baris bawah */}
//                 <div className="flex items-center gap-2.5 px-3 py-2">
//                     {!isImage && (
//                         <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
//                             <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
//                         </div>
//                     )}
//                     <div className="flex-1 min-w-0">
//                         <p className="text-xs text-slate-700 truncate">{file.file_name}</p>
//                         <p className="text-[10px] text-slate-400">{formatFileSize(file.file_size)}</p>
//                     </div>
//                     <a
//                         href={url}
//                         download={file.file_name}
//                         className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
//                         title="Download"
//                     >
//                         <Download className="w-3.5 h-3.5" />
//                     </a>
//                 </div>
//             </div>

//             {lightbox && (
//                 <Lightbox
//                     src={url}
//                     name={file.file_name}
//                     onClose={() => setLightbox(false)}
//                 />
//             )}
//         </>
//     );
// }

// ── Action Modal ──────────────────────────────────────────────────────────────

function ActionModal({
    action,
    onClose,
    onSubmit,
    loading,
}: {
    action: ActionType;
    onClose: () => void;
    onSubmit: (data: ClassifyBody | InvestigateBody | ApproveRejectBody) => void;
    loading: boolean;
}) {
    const [form, setForm] = useState<Record<string, string>>({});
    if (!action) return null;

    const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

    const handleSubmit = () => {
        if (action === "classify") {
            onSubmit({
                risk_level: form.risk_level || "low",
                priority: form.priority || "low",
                notes: form.notes || "",
                pic_id: form.pic_id ? Number(form.pic_id) : undefined,
            } as ClassifyBody);
        } else if (action === "investigate") {
            onSubmit({
                root_cause: form.root_cause || "",
                countermeasures: form.countermeasures || "",
            } as InvestigateBody);
        } else {
            onSubmit({ comment: form.comment || "" } as ApproveRejectBody);
        }
    };

    const titles: Record<NonNullable<ActionType>, string> = {
        classify: "Classify Report",
        investigate: "Submit Investigation",
        approve: "Approve Report",
        reject: "Reject Report",
    };

    const btnColor: Record<NonNullable<ActionType>, string> = {
        classify: "bg-blue-600 hover:bg-blue-700",
        investigate: "bg-indigo-600 hover:bg-indigo-700",
        approve: "bg-emerald-600 hover:bg-emerald-700",
        reject: "bg-red-600 hover:bg-red-700",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-800">{titles[action]}</p>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    {action === "classify" && (
                        <>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Risk Level</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                                    value={form.risk_level || "low"}
                                    onChange={(e) => set("risk_level", e.target.value)}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Priority</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                                    value={form.priority || "low"}
                                    onChange={(e) => set("priority", e.target.value)}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none"
                                    placeholder="Classification notes..."
                                    value={form.notes || ""}
                                    onChange={(e) => set("notes", e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {action === "investigate" && (
                        <>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Root Cause *</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none"
                                    placeholder="What caused this issue..."
                                    value={form.root_cause || ""}
                                    onChange={(e) => set("root_cause", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Countermeasures *</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none"
                                    placeholder="Actions taken or planned..."
                                    value={form.countermeasures || ""}
                                    onChange={(e) => set("countermeasures", e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {(action === "approve" || action === "reject") && (
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                                Comment {action === "reject" && "*"}
                            </label>
                            <textarea
                                rows={4}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none"
                                placeholder={
                                    action === "reject"
                                        ? "Reason for rejection (required)..."
                                        : "Optional comment..."
                                }
                                value={form.comment || ""}
                                onChange={(e) => set("comment", e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={cn(
                            "px-3 py-1.5 text-xs text-white rounded-lg flex items-center gap-1.5 disabled:opacity-60",
                            btnColor[action]
                        )}
                    >
                        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

interface Props {
    report: RiskReport | null;
    onClose: () => void;
    onRefresh: () => void;
}

export default function ReportDrawer({ report, onClose, onRefresh }: Props) {
    const user = useAuthStore((s) => s.user);
    const [tab, setTab] = useState<Tab>("overview");
    const [detail, setDetail] = useState<RiskReport | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [activeAction, setActiveAction] = useState<ActionType>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const [uploadLoading, setUploadLoading] = useState(false);

    useEffect(() => {
        if (!report) {
            setDetail(null);
            setTab("overview");
        }
    }, [report]);

    useEffect(() => {
        if (!report) return;
        setDetailLoading(true);
        api.get<RiskReport>(`/reports/${report.id}`)
            .then((res) => setDetail(res.data))
            .catch(() => setDetail(report))
            .finally(() => setDetailLoading(false));
    }, [report?.id]);

    const handleAction = async (data: ClassifyBody | InvestigateBody | ApproveRejectBody) => {
        if (!detail) return;
        setActionLoading(true);
        setActionError(null);
        try {
            if (activeAction === "classify") {
                await api.patch(`/reports/${detail.id}/classify`, data);
            } else if (activeAction === "investigate") {
                await api.patch(`/reports/${detail.id}/investigate`, data);
            } else if (activeAction === "approve") {
                await api.post(`/reports/${detail.id}/approve`, data);
            } else if (activeAction === "reject") {
                await api.post(`/reports/${detail.id}/reject`, data);
            }
            setActiveAction(null);
            const res = await api.get<RiskReport>(`/reports/${detail.id}`);
            setDetail(res.data);
            onRefresh();
        } catch (err: any) {
            setActionError(err?.response?.data?.error ?? "Something went wrong");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!detail || !e.target.files?.[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);
        setUploadLoading(true);
        try {
            await api.post(`/reports/${detail.id}/files`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const res = await api.get<RiskReport>(`/reports/${detail.id}`);
            setDetail(res.data);
        } catch {
            // silent
        } finally {
            setUploadLoading(false);
            e.target.value = "";
        }
    };

    const canClassify =
        detail &&
        detail.status === "declaration" &&
        (user?.role === "pic" || user?.role === "admin");

    const canInvestigate =
        detail &&
        (detail.status === "classification" || detail.status === "investigation") &&
        (user?.role === "pic" || user?.role === "admin");

    const canApproveReject =
        detail &&
        detail.status === "investigation" &&
        (user?.role === "hod" || user?.role === "admin");

    if (!report) return null;

    const d = detail ?? report;

    // pisahkan foto dan file lain
    const imageFiles = d.files?.filter((f) => isImageMime(f.mime_type)) ?? [];
    const otherFiles = d.files?.filter((f) => !isImageMime(f.mime_type)) ?? [];

    return (
        <>
            {/* Overlay mobile */}
            <div className="fixed inset-0 bg-black/10 z-20 lg:hidden" onClick={onClose} />

            {/* Drawer */}
            <aside className="w-[380px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full z-30">

                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-slate-800">{d.code}</span>
                            {d.is_overdue && (
                                <span className="flex items-center gap-0.5 text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                STATUS_COLOR[d.status]
                            )}>
                                {STATUS_LABEL[d.status]}
                            </span>
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                RISK_COLOR[d.risk_level]
                            )}>
                                {RISK_LABEL[d.risk_level]}
                            </span>
                            {d.priority && (
                                <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                    {d.priority} priority
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Action error */}
                {actionError && (
                    <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                        {actionError}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-4">
                    {(["overview", "activities", "files"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "py-2.5 px-3 text-xs font-medium border-b-2 transition-colors capitalize",
                                tab === t
                                    ? "border-slate-800 text-slate-800"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {t}
                            {t === "files" && d.files && d.files.length > 0 && (
                                <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                    {d.files.length}
                                </span>
                            )}
                            {t === "activities" && d.activities && d.activities.length > 0 && (
                                <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                    {d.activities.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {detailLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <>
                            {/* ── OVERVIEW ── */}
                            {tab === "overview" && (
                                <div>
                                    <Section title="Description">
                                        <p className="text-xs text-slate-700 leading-relaxed">{d.description}</p>
                                        {d.reporter_name && (
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Reported by {d.reporter_name}
                                            </p>
                                        )}
                                    </Section>

                                    {(d.sla_deadline_classification || d.sla_deadline_investigation || d.sla_deadline_approval) && (
                                        <Section title="SLA Deadlines">
                                            <div className="flex flex-col gap-1.5">
                                                <SLABadge deadline={d.sla_deadline_classification} label="Classification" />
                                                <SLABadge deadline={d.sla_deadline_investigation} label="Investigation" />
                                                <SLABadge deadline={d.sla_deadline_approval} label="Approval" />
                                            </div>
                                        </Section>
                                    )}

                                    <Section title="Details">
                                        <div className="grid grid-cols-2 gap-x-4">
                                            <Field
                                                label="Location"
                                                value={d.location ? (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        {d.location.area_name}
                                                        {d.location.site && (
                                                            <span className="text-slate-400">· {d.location.site}</span>
                                                        )}
                                                    </span>
                                                ) : undefined}
                                            />
                                            <Field
                                                label="Department"
                                                value={d.department ? (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-slate-400" />
                                                        {d.department.name}
                                                    </span>
                                                ) : undefined}
                                            />
                                            <Field label="Reported" value={formatDate(d.created_at)} />
                                            <Field
                                                label="PIC"
                                                value={d.pic ? (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3 text-slate-400" />
                                                        {d.pic.name}
                                                    </span>
                                                ) : undefined}
                                            />
                                        </div>
                                        {d.pic_notes && <Field label="PIC Notes" value={d.pic_notes} />}
                                    </Section>

                                    {(d.root_cause || d.countermeasures) && (
                                        <Section title="Investigation">
                                            <Field label="Root Cause" value={d.root_cause} />
                                            <Field label="Countermeasures" value={d.countermeasures} />
                                            {d.investigated_at && (
                                                <p className="text-[10px] text-slate-400">
                                                    Submitted {formatDate(d.investigated_at)}
                                                </p>
                                            )}
                                        </Section>
                                    )}

                                    {d.hod_comment && (
                                        <Section title={d.approved_at ? "HOD Approval" : "HOD Feedback"}>
                                            <p className="text-xs text-slate-700">{d.hod_comment}</p>
                                            {d.approved_at && (
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Approved {formatDate(d.approved_at)}
                                                </p>
                                            )}
                                            {d.rejected_at && (
                                                <p className="text-[10px] text-red-400 mt-1">
                                                    Rejected {formatDate(d.rejected_at)}
                                                </p>
                                            )}
                                        </Section>
                                    )}
                                </div>
                            )}

                            {/* ── ACTIVITIES ── */}
                            {tab === "activities" && (
                                <div>
                                    {!d.activities || d.activities.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-8">No activity yet</p>
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-slate-100" />
                                            <div className="space-y-4">
                                                {[...d.activities].reverse().map((act) => (
                                                    <div key={act.id} className="flex gap-3 relative">
                                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-200 border-2 border-white shrink-0 mt-0.5 z-10" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-slate-700 capitalize">
                                                                {act.action}
                                                            </p>
                                                            {act.from_status && act.to_status && (
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {STATUS_LABEL[act.from_status]}
                                                                    </span>
                                                                    <ChevronRight className="w-2.5 h-2.5 text-slate-300" />
                                                                    <span className="text-[10px] text-slate-600">
                                                                        {STATUS_LABEL[act.to_status]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {act.notes && (
                                                                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                                                    {act.notes}
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {act.by_user_name && `${act.by_user_name} · `}
                                                                {formatDate(act.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── FILES ── */}
                            {tab === "files" && (
                                <div>
                                    {!d.files || d.files.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-8">Belum ada file terlampir</p>
                                    ) : (
                                        <div className="mb-4 space-y-4">
                                            {/* foto — grid 2 kolom */}
                                            {imageFiles.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                                        Foto ({imageFiles.length})
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {imageFiles.map((f) => (
                                                            <FileCard key={f.id} file={f} reportId={d.id} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* file lain — list */}
                                            {otherFiles.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                                        Dokumen ({otherFiles.length})
                                                    </p>
                                                    <div className="space-y-2">
                                                        {otherFiles.map((f) => (
                                                            <FileCard key={f.id} file={f} reportId={d.id} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Upload tambahan */}
                                    <label className={cn(
                                        "flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors",
                                        uploadLoading && "opacity-50 pointer-events-none"
                                    )}>
                                        {uploadLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        ) : (
                                            <Upload className="w-4 h-4 text-slate-400" />
                                        )}
                                        <span className="text-xs text-slate-400">
                                            {uploadLoading ? "Uploading..." : "Upload file"}
                                        </span>
                                        <input type="file" className="hidden" onChange={handleUpload} />
                                    </label>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                {(canClassify || canInvestigate || canApproveReject) && (
                    <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap gap-2">
                        {canClassify && (
                            <button
                                onClick={() => { setActionError(null); setActiveAction("classify"); }}
                                className="flex-1 text-xs py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                Classify
                            </button>
                        )}
                        {canInvestigate && (
                            <button
                                onClick={() => { setActionError(null); setActiveAction("investigate"); }}
                                className="flex-1 text-xs py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                            >
                                Investigate
                            </button>
                        )}
                        {canApproveReject && (
                            <>
                                <button
                                    onClick={() => { setActionError(null); setActiveAction("approve"); }}
                                    className="flex-1 text-xs py-2 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => { setActionError(null); setActiveAction("reject"); }}
                                    className="flex-1 text-xs py-2 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                    </div>
                )}
            </aside>

            {activeAction && (
                <ActionModal
                    action={activeAction}
                    onClose={() => setActiveAction(null)}
                    onSubmit={handleAction}
                    loading={actionLoading}
                />
            )}
        </>
    );
}