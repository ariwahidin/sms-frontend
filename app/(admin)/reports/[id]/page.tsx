/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Check,
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
    X,
    ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import type { RiskReport, ReportFile, ReportStatus } from "@/types/api";
import { cn, formatDate, STATUS_LABEL, STATUS_COLOR, RISK_LABEL, RISK_COLOR } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Stepper config ────────────────────────────────────────────────────────────
// urutan & label mengikuti SOP: Khai báo → Xác nhận → Nguyên nhân & giải pháp →
// Chờ phê duyệt → Đóng (versi EN: Declaration → Classification → Investigation
// → Approval → Closed)

const STEPS: { status: ReportStatus; label: string }[] = [
    { status: "declaration", label: "Declaration" },
    { status: "classification", label: "Classification" },
    { status: "investigation", label: "Investigation" },
    { status: "approval", label: "Approval" },
    { status: "closed", label: "Closed" },
];

function stepIndex(status: ReportStatus): number {
    // "approval" di backend sebenarnya direpresentasikan sebagai status
    // "investigation" yang menunggu HOD (lihat report_service.go — tidak ada
    // status approval terpisah, approval row di stepper ini menandai
    // "investigation selesai, menunggu keputusan HOD"). Closed = step terakhir.
    const order: ReportStatus[] = ["declaration", "classification", "investigation", "approval", "closed"];
    const idx = order.indexOf(status);
    return idx === -1 ? 0 : idx;
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

function fileUrl(reportId: number, fileId: number) {
    return `/reports/${reportId}/files/${fileId}`;
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ status }: { status: ReportStatus }) {
    const current = stepIndex(status);
    return (
        <div className="flex items-center w-full overflow-x-auto pb-1">
            {STEPS.map((step, i) => {
                const done = i < current || status === "closed";
                const active = i === current && status !== "closed";
                return (
                    <div key={step.status} className="flex items-center flex-1 min-w-[110px]">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div
                                className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors",
                                    done
                                        ? "bg-emerald-500 text-white"
                                        : active
                                        ? "bg-slate-800 text-white ring-4 ring-slate-200"
                                        : "bg-slate-100 text-slate-400"
                                )}
                            >
                                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] font-medium whitespace-nowrap",
                                    done || active ? "text-slate-700" : "text-slate-300"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "flex-1 h-px mx-2 -mt-4 transition-colors",
                                    i < current || status === "closed" ? "bg-emerald-400" : "bg-slate-200"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── SLA Badge ─────────────────────────────────────────────────────────────────

function SLABadge({ deadline, label }: { deadline?: string | null; label: string }) {
    if (!deadline) return null;
    const dl = new Date(deadline);
    const now = new Date();
    const overdue = dl < now;
    const hours = Math.abs(dl.getTime() - now.getTime()) / 36e5;
    return (
        <div
            className={cn(
                "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border",
                overdue
                    ? "text-red-600 bg-red-50 border-red-200"
                    : hours < 2
                    ? "text-amber-600 bg-amber-50 border-amber-200"
                    : "text-slate-500 bg-slate-50 border-slate-200"
            )}
        >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="text-slate-400">{label}:</span>
            {overdue ? "overdue" : formatDate(deadline)}
        </div>
    );
}

// ── Column / Field primitives ───────────────────────────────────────────────

function ColumnCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {title}
            </p>
            {children}
        </div>
    );
}

function ReadField({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="mb-3 last:mb-0">
            <p className="text-[10px] text-slate-400 mb-1">{label}</p>
            <p className="text-xs text-slate-700 leading-relaxed">{value || "—"}</p>
        </div>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    placeholder,
    required,
    rows = 3,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    rows?: number;
}) {
    return (
        <div className="mb-3 last:mb-0">
            <label className="text-[10px] text-slate-400 mb-1 block">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <textarea
                rows={rows}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none outline-none focus:border-slate-400 transition-colors"
            />
        </div>
    );
}

// ── Image Lightbox ────────────────────────────────────────────────────────────

function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center"
            onClick={onClose}
        >
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
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors ml-2">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <img
                src={src}
                alt={name}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// ── File Card ─────────────────────────────────────────────────────────────────

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
            .catch(() => {
                if (!cancelled) setObjectUrl(null);
            })
            .finally(() => {
                if (!cancelled) setImgLoading(false);
            });
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
                                <img src={objectUrl} alt={file.file_name} className="w-full h-full object-cover" />
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
                <Lightbox src={objectUrl} name={file.file_name} onClose={() => setLightbox(false)} />
            )}
        </>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = Number(params.id);
    const user = useAuthStore((s) => s.user);

    const [detail, setDetail] = useState<RiskReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    // form state untuk tiap aksi — diisi inline di kolom yang sesuai
    const [classifyForm, setClassifyForm] = useState({ risk_level: "low", priority: "low", notes: "" });
    const [investigateForm, setInvestigateForm] = useState({ root_cause: "", countermeasures: "" });
    const [hodComment, setHodComment] = useState("");

    const fetchDetail = () => {
        setLoading(true);
        api
            .get<RiskReport>(`/reports/${reportId}`)
            .then((res) => {
                setDetail(res.data);
                setClassifyForm({
                    risk_level: res.data.risk_level || "low",
                    priority: res.data.priority || "low",
                    notes: res.data.pic_notes || "",
                });
                setInvestigateForm({
                    root_cause: res.data.root_cause || "",
                    countermeasures: res.data.countermeasures || "",
                });
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!reportId) return;
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportId]);

    const runAction = async (
        fn: () => Promise<unknown>,
    ) => {
        setActionLoading(true);
        setActionError(null);
        try {
            await fn();
            fetchDetail();
        } catch (err: any) {
            setActionError(err?.response?.data?.error ?? "Something went wrong");
        } finally {
            setActionLoading(false);
        }
    };

    const submitClassify = () =>
        runAction(() => api.patch(`/reports/${reportId}/classify`, classifyForm as ClassifyBody));

    const submitInvestigate = () =>
        runAction(() => api.patch(`/reports/${reportId}/investigate`, investigateForm as InvestigateBody));

    const submitApprove = () =>
        runAction(() => api.post(`/reports/${reportId}/approve`, { comment: hodComment } as ApproveRejectBody));

    const submitReject = () => {
        if (!hodComment.trim()) {
            setActionError("Rejection reason (comment) is required");
            return;
        }
        return runAction(() => api.post(`/reports/${reportId}/reject`, { comment: hodComment } as ApproveRejectBody));
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);
        setUploadLoading(true);
        try {
            await api.post(`/reports/${reportId}/files`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            fetchDetail();
        } catch {
            // silent
        } finally {
            setUploadLoading(false);
            e.target.value = "";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
        );
    }

    if (notFound || !detail) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <AlertTriangle className="w-8 h-8 text-slate-300" />
                <p className="text-sm">Report not found</p>
                <button
                    onClick={() => router.push("/reports")}
                    className="text-xs text-slate-500 hover:text-slate-700 mt-2"
                >
                    Back to reports
                </button>
            </div>
        );
    }

    const d = detail;

    const canClassify =
        d.status === "declaration" && (user?.role === "pic" || user?.role === "admin");
    const canInvestigate =
        (d.status === "classification" || d.status === "investigation") &&
        (user?.role === "pic" || user?.role === "admin");
    const canApproveReject =
        d.status === "investigation" && (user?.role === "hod" || user?.role === "admin");

    const imageFiles = d.files?.filter((f) => isImageMime(f.mime_type)) ?? [];
    const otherFiles = d.files?.filter((f) => !isImageMime(f.mime_type)) ?? [];

    return (
        <div className="px-6 py-5 max-w-[1400px] mx-auto">
            {/* ── Header: code, badges, back button ───────────────────────────── */}
            <div className="flex items-start justify-between mb-4 gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base font-semibold text-slate-800">{d.code}</span>
                        {d.is_overdue && (
                            <span className="flex items-center gap-0.5 text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", STATUS_COLOR[d.status])}>
                            {STATUS_LABEL[d.status]}
                        </span>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", RISK_COLOR[d.risk_level])}>
                            {RISK_LABEL[d.risk_level]}
                        </span>
                        {d.priority && (
                            <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                {d.priority} priority
                            </span>
                        )}
                        {d.location?.area_name && (
                            <span className="text-[10px] text-slate-400">
                                at {d.location.area_name}
                                {d.location.site && ` · ${d.location.site}`}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => router.push("/reports")}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors shrink-0"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                </button>
            </div>

            {/* ── Stepper ──────────────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-5">
                <Stepper status={d.status} />
            </div>

            {actionError && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                    {actionError}
                </div>
            )}

            {/* ── 3-column grid ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ── Kolom kiri: lokasi, dept, deskripsi ────────────────────────── */}
                <div className="space-y-4">
                    <ColumnCard title="Detection">
                        <div className="grid grid-cols-2 gap-x-3">
                            <ReadField
                                label="Location"
                                value={d.location ? (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        {d.location.area_name}
                                    </span>
                                ) : undefined}
                            />
                            <ReadField
                                label="Department"
                                value={d.department ? (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                        {d.department.name}
                                    </span>
                                ) : undefined}
                            />
                        </div>
                        <ReadField label="Summary" value={d.description} />
                        <ReadField
                            label="Reported by"
                            value={
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    {d.reporter_name || "Anonymous"}
                                </span>
                            }
                        />
                        <ReadField label="Reported at" value={formatDate(d.created_at)} />
                    </ColumnCard>

                    {/* PIC notes — read-only kalau sudah ada, atau bagian dari form classify */}
                    {d.pic && (
                        <ColumnCard title="PIC">
                            <ReadField
                                label="Assigned to"
                                value={
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                                        {d.pic.name}
                                    </span>
                                }
                            />
                            {d.pic_notes && !canClassify && <ReadField label="Notes" value={d.pic_notes} />}
                        </ColumnCard>
                    )}
                </div>

                {/* ── Kolom tengah: causes & countermeasures / classify form ───────── */}
                <div className="space-y-4">
                    {canClassify ? (
                        <ColumnCard title="Classify & Confirm">
                            <div className="grid grid-cols-2 gap-x-3 mb-3">
                                <div>
                                    <label className="text-[10px] text-slate-400 mb-1 block">Risk Level</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-400"
                                        value={classifyForm.risk_level}
                                        onChange={(e) => setClassifyForm((p) => ({ ...p, risk_level: e.target.value }))}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 mb-1 block">Priority</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-400"
                                        value={classifyForm.priority}
                                        onChange={(e) => setClassifyForm((p) => ({ ...p, priority: e.target.value }))}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <TextAreaField
                                label="Notes"
                                value={classifyForm.notes}
                                onChange={(v) => setClassifyForm((p) => ({ ...p, notes: v }))}
                                placeholder="Classification notes..."
                            />
                            <button
                                onClick={submitClassify}
                                disabled={actionLoading}
                                className="w-full mt-3 text-xs py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                                {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Confirm Classification
                            </button>
                        </ColumnCard>
                    ) : (
                        d.classified_at && (
                            <ColumnCard title="Classification">
                                <ReadField label="Notes" value={d.pic_notes} />
                                <ReadField label="Confirmed at" value={formatDate(d.classified_at)} />
                            </ColumnCard>
                        )
                    )}

                    {canInvestigate ? (
                        <ColumnCard title="Causes & Countermeasures">
                            <TextAreaField
                                label="Root Cause"
                                required
                                value={investigateForm.root_cause}
                                onChange={(v) => setInvestigateForm((p) => ({ ...p, root_cause: v }))}
                                placeholder="What caused this issue..."
                            />
                            <TextAreaField
                                label="Countermeasures"
                                required
                                value={investigateForm.countermeasures}
                                onChange={(v) => setInvestigateForm((p) => ({ ...p, countermeasures: v }))}
                                placeholder="Actions taken or planned..."
                            />
                            <button
                                onClick={submitInvestigate}
                                disabled={actionLoading}
                                className="w-full mt-1 text-xs py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                                {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Submit Investigation
                            </button>
                        </ColumnCard>
                    ) : (
                        (d.root_cause || d.countermeasures) && (
                            <ColumnCard title="Causes & Countermeasures">
                                <ReadField label="Root Cause" value={d.root_cause} />
                                <ReadField label="Countermeasures" value={d.countermeasures} />
                                {d.investigated_at && (
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Submitted {formatDate(d.investigated_at)}
                                    </p>
                                )}
                            </ColumnCard>
                        )
                    )}

                    {canApproveReject && (
                        <ColumnCard title="HOD Review">
                            <TextAreaField
                                label="Comment"
                                value={hodComment}
                                onChange={setHodComment}
                                placeholder="Required if rejecting, optional if approving..."
                            />
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={submitApprove}
                                    disabled={actionLoading}
                                    className="flex-1 text-xs py-2 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                                >
                                    {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Approve
                                </button>
                                <button
                                    onClick={submitReject}
                                    disabled={actionLoading}
                                    className="flex-1 text-xs py-2 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-60"
                                >
                                    Reject
                                </button>
                            </div>
                        </ColumnCard>
                    )}

                    {d.hod_comment && (
                        <ColumnCard title={d.approved_at ? "HOD Approval" : "HOD Feedback"}>
                            <p className="text-xs text-slate-700 leading-relaxed">{d.hod_comment}</p>
                            {d.approved_at && (
                                <p className="text-[10px] text-slate-400 mt-2">Approved {formatDate(d.approved_at)}</p>
                            )}
                            {d.rejected_at && (
                                <p className="text-[10px] text-red-400 mt-2">Rejected {formatDate(d.rejected_at)}</p>
                            )}
                        </ColumnCard>
                    )}
                </div>

                {/* ── Kolom kanan: SLA timeline + files ─────────────────────────── */}
                <div className="space-y-4">
                    {(d.sla_deadline_classification || d.sla_deadline_investigation || d.sla_deadline_approval) && (
                        <ColumnCard title="SLA Timeline">
                            <div className="flex flex-col gap-2">
                                <SLABadge deadline={d.sla_deadline_classification} label="Classification" />
                                <SLABadge deadline={d.sla_deadline_investigation} label="Investigation" />
                                <SLABadge deadline={d.sla_deadline_approval} label="Approval" />
                            </div>
                        </ColumnCard>
                    )}

                    <ColumnCard title={`Files${d.files?.length ? ` (${d.files.length})` : ""}`}>
                        {!d.files || d.files.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No files attached yet</p>
                        ) : (
                            <div className="space-y-4 mb-3">
                                {imageFiles.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-slate-400 mb-2">Photos ({imageFiles.length})</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {imageFiles.map((f) => (
                                                <FileCard key={f.id} file={f} reportId={d.id} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {otherFiles.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-slate-400 mb-2">Documents ({otherFiles.length})</p>
                                        <div className="space-y-2">
                                            {otherFiles.map((f) => (
                                                <FileCard key={f.id} file={f} reportId={d.id} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <label
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors",
                                uploadLoading && "opacity-50 pointer-events-none"
                            )}
                        >
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
                    </ColumnCard>

                    {/* Activity log */}
                    {d.activities && d.activities.length > 0 && (
                        <ColumnCard title="Activity Log">
                            <div className="relative">
                                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-slate-100" />
                                <div className="space-y-4">
                                    {[...d.activities].reverse().map((act) => (
                                        <div key={act.id} className="flex gap-3 relative">
                                            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 border-2 border-white shrink-0 mt-0.5 z-10" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-slate-700 capitalize">{act.action}</p>
                                                {act.from_status && act.to_status && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[10px] text-slate-400">{STATUS_LABEL[act.from_status]}</span>
                                                        <ChevronRight className="w-2.5 h-2.5 text-slate-300" />
                                                        <span className="text-[10px] text-slate-600">{STATUS_LABEL[act.to_status]}</span>
                                                    </div>
                                                )}
                                                {act.notes && (
                                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{act.notes}</p>
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
                        </ColumnCard>
                    )}
                </div>
            </div>
        </div>
    );
}