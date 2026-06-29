"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertTriangle,
    ChevronRight,
    CheckCircle2,
    Loader2,
    MapPin,
    Building2,
    User,
    FileText,
    ArrowLeft,
    ImagePlus,
    Camera,
    QrCode,
    X,
} from "lucide-react";
import api from "@/lib/api";
import type { Location, Department, RiskLevel } from "@/types/api";

// ── Konstanta ─────────────────────────────────────────────────────────────────

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_LABEL = "JPG, PNG, WEBP";
const WATERMARK_QUALITY = 0.85;
const MIN_DESC_LENGTH = 10;

// ── Risk options ──────────────────────────────────────────────────────────────

const RISKS: {
    value: RiskLevel;
    label: string;
    desc: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
}[] = [
    {
        value: "low",
        label: "Low",
        desc: "Ada risiko kecelakaan jika tidak segera diperbaiki",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-300",
        dot: "bg-emerald-500",
    },
    {
        value: "medium",
        label: "Medium",
        desc: "Ada risiko terjadinya kecelakaan",
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-300",
        dot: "bg-amber-500",
    },
    {
        value: "high",
        label: "High",
        desc: "Ada risiko kecelakaan yang mengancam saat ini juga",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-300",
        dot: "bg-red-500",
    },
];

// ── Watermark ─────────────────────────────────────────────────────────────────

function formatTimestamp(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
}

async function applyWatermark(file: File, reporterName: string): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas not supported"));

            ctx.drawImage(img, 0, 0);

            const scale = Math.max(canvas.width / 1080, 1);
            const fontSize = Math.round(28 * scale);
            const padding = Math.round(20 * scale);
            const lineHeight = Math.round(fontSize * 1.45);

            const lines: string[] = [formatTimestamp(new Date())];
            if (reporterName.trim()) lines.push(reporterName.trim());

            ctx.font = `bold ${fontSize}px sans-serif`;

            const maxTextWidth = lines.reduce(
                (max, line) => Math.max(max, ctx.measureText(line).width),
                0
            );
            const boxW = maxTextWidth + padding * 2;
            const boxH = lines.length * lineHeight + padding * 1.5;
            const boxX = padding;
            const boxY = canvas.height - boxH - padding;

            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, Math.round(8 * scale));
            ctx.fill();

            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textBaseline = "top";
            lines.forEach((line, i) => {
                ctx.fillText(line, boxX + padding, boxY + padding * 0.75 + i * lineHeight);
            });

            canvas.toBlob(
                (blob) => {
                    if (!blob) return reject(new Error("Failed to export canvas"));
                    const watermarked = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, "") + "_wm.jpg",
                        { type: "image/jpeg" }
                    );
                    resolve(watermarked);
                },
                "image/jpeg",
                WATERMARK_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };

        img.src = url;
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Section wrapper (compact label + content) ──────────────────────────────────

function Field({
    icon: Icon,
    label,
    optional,
    error,
    children,
}: {
    icon?: React.ElementType;
    label: string;
    optional?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
                {optional && <span className="text-slate-300 font-normal">· opsional</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-500 mt-1.5 px-1">{error}</p>}
        </div>
    );
}

// ── File preview item ─────────────────────────────────────────────────────────

function FileItem({
    file,
    preview,
    watermarked,
    onRemove,
}: {
    file: File;
    preview: string;
    watermarked: boolean;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt={file.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                    {watermarked && (
                        <span className="shrink-0 text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                            WM
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
            </div>

            <button
                onClick={onRemove}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ code, onNew }: { code: string; onNew: () => void }) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
            <div className="w-full max-w-sm text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Laporan Terkirim</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Laporan risiko Anda telah diterima dan menunggu klasifikasi.
                </p>
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-6 inline-block w-full">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Kode Laporan</p>
                    <p className="font-mono text-2xl font-bold text-slate-800 tracking-widest">{code}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Simpan kode ini untuk referensi</p>
                </div>
                <button
                    onClick={onNew}
                    className="w-full py-3 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                    Buat Laporan Baru
                </button>
            </div>
        </div>
    );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
    risk_level: RiskLevel;
    description: string;
    reporter_name: string;
    location_id?: number;
    department_id?: number;
}

interface FileEntry {
    file: File;
    preview: string;
    watermarked: boolean;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function DeclareForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const qrToken = searchParams.get("qr");

    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(true);

    // true selama proses lookup QR token sedang berjalan (terpisah dari
    // loadingMeta supaya UI bisa kasih pesan berbeda: "menyiapkan form" vs
    // "membaca lokasi dari QR code")
    const [resolvingQR, setResolvingQR] = useState(!!qrToken);
    const [qrError, setQrError] = useState<string | null>(null);

    // field mana saja yang ter-prefill dari QR — dipakai untuk styling
    // (badge "dari QR") dan supaya user tahu nilainya auto-filled, bukan
    // mereka pilih sendiri. Sesuai SOP: tetap boleh diubah manual.
    const [prefilledFromQR, setPrefilledFromQR] = useState<{
        location: boolean;
        department: boolean;
    }>({ location: false, department: false });

    const [form, setForm] = useState<FormState>({
        risk_level: "low",
        description: "",
        reporter_name: "",
    });
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const [processingCamera, setProcessingCamera] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successCode, setSuccessCode] = useState<string | null>(null);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);

    const selectedRisk = RISKS.find((r) => r.value === form.risk_level);

    useEffect(() => {
        Promise.all([
            api.get<Location[]>("/no-auth/locations").catch(() => ({ data: [] as Location[] })),
            api.get<Department[]>("/no-auth/departments").catch(() => ({ data: [] as Department[] })),
        ]).then(([loc, dept]) => {
            setLocations(loc.data);
            setDepartments(dept.data);
        }).finally(() => setLoadingMeta(false));
    }, []);

    // ── Prefill dari QR code ─────────────────────────────────────────────────
    // Sesuai SOP: scan QR mengisi otomatis "Detection location" dan
    // "Occurrence department". Kalau departemen lokasi belum di-set di Master
    // Data, hanya lokasi yang ter-prefill — user tetap bisa pilih manual.
    useEffect(() => {
        if (!qrToken) {
            setResolvingQR(false);
            return;
        }

        setResolvingQR(true);
        setQrError(null);

        api.get<Location>(`/locations/${qrToken}`)
            .then((res) => {
                const loc = res.data;
                setForm((p) => ({
                    ...p,
                    location_id: loc.id,
                    department_id: loc.department_id ?? p.department_id,
                }));
                setPrefilledFromQR({
                    location: true,
                    department: !!loc.department_id,
                });
            })
            .catch(() => {
                setQrError("QR code tidak dikenali. Silakan pilih lokasi secara manual.");
            })
            .finally(() => setResolvingQR(false));
    }, [qrToken]);

    useEffect(() => {
        return () => {
            entries.forEach((e) => URL.revokeObjectURL(e.preview));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Field setter ───────────────────────────────────────────────────────────

    const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
        setForm((p) => ({ ...p, [key]: val }));
        setErrors((p) => ({ ...p, [key]: "" }));
        if (key === "location_id") {
            setPrefilledFromQR((p) => ({ ...p, location: false }));
        }
        if (key === "department_id") {
            setPrefilledFromQR((p) => ({ ...p, department: false }));
        }
    };

    // ── File handling ──────────────────────────────────────────────────────────

    const canAddMore = entries.length < MAX_FILES;

    const validateAndAdd = async (incoming: FileList | null, fromCamera: boolean) => {
        if (!incoming || incoming.length === 0) return;
        setFileError(null);

        const toAdd = Array.from(incoming);

        if (entries.length + toAdd.length > MAX_FILES) {
            setFileError(`Maksimal ${MAX_FILES} foto`);
            return;
        }

        for (const f of toAdd) {
            if (!ALLOWED_MIME.includes(f.type)) {
                setFileError(`Format tidak didukung: ${f.name}. Gunakan ${ALLOWED_LABEL}`);
                return;
            }
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                setFileError(`File terlalu besar: ${f.name}. Maks ${MAX_FILE_SIZE_MB}MB`);
                return;
            }
        }

        if (fromCamera) {
            setProcessingCamera(true);
            try {
                const newEntries: FileEntry[] = [];
                for (const f of toAdd) {
                    const wm = await applyWatermark(f, form.reporter_name);
                    newEntries.push({
                        file: wm,
                        preview: URL.createObjectURL(wm),
                        watermarked: true,
                    });
                }
                setEntries((prev) => [...prev, ...newEntries]);
            } catch {
                setFileError("Gagal memproses foto dari kamera. Coba lagi.");
            } finally {
                setProcessingCamera(false);
            }
        } else {
            const newEntries: FileEntry[] = [];
            for (const f of toAdd) {
                const dup = entries.some((e) => e.file.name === f.name && e.file.size === f.size);
                if (!dup) {
                    newEntries.push({
                        file: f,
                        preview: URL.createObjectURL(f),
                        watermarked: false,
                    });
                }
            }
            setEntries((prev) => [...prev, ...newEntries]);
        }
    };

    const removeEntry = (index: number) => {
        URL.revokeObjectURL(entries[index].preview);
        setEntries((prev) => prev.filter((_, i) => i !== index));
        setFileError(null);
    };

    // ── Validasi ───────────────────────────────────────────────────────────────

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.risk_level) errs.risk_level = "Pilih risk level";
        if (!form.description.trim()) {
            errs.description = "Deskripsi wajib diisi";
        } else if (form.description.trim().length < MIN_DESC_LENGTH) {
            errs.description = `Deskripsi terlalu singkat (min ${MIN_DESC_LENGTH} karakter)`;
        }
        setErrors(errs);

        // scroll ke field error pertama
        if (errs.description) {
            descRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            descRef.current?.focus();
        }

        return Object.keys(errs).length === 0;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const submit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setSubmitError(null);

        try {
            const fd = new FormData();
            fd.append("description", form.description);
            fd.append("risk_level", form.risk_level);
            if (form.reporter_name) fd.append("reporter_name", form.reporter_name);
            if (form.location_id) fd.append("location_id", String(form.location_id));
            if (form.department_id) fd.append("department_id", String(form.department_id));
            entries.forEach((e) => fd.append("files", e.file));

            const res = await api.post<{ code: string; id: number }>("/reports", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSuccessCode(res.data.code);
        } catch (err: any) {
            setSubmitError(err?.response?.data?.error ?? "Gagal mengirim laporan. Coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        entries.forEach((e) => URL.revokeObjectURL(e.preview));
        setForm({ risk_level: "low", description: "", reporter_name: "" });
        setEntries([]);
        setFileError(null);
        setErrors({});
        setSuccessCode(null);
        setSubmitError(null);
    };

    if (successCode) return <SuccessScreen code={successCode} onNew={reset} />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">

            {/* ── Top bar ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Buat Laporan Risiko</p>
                    <p className="text-[10px] text-slate-400">Isi form di bawah, lalu kirim</p>
                </div>
            </div>

            {/* ── Content (single scroll form) ── */}
            <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-5">

                {/* Banner: sedang membaca lokasi dari QR code */}
                {resolvingQR && (
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3.5 py-2.5">
                        <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
                        <p className="text-xs text-slate-500">Membaca lokasi dari QR code...</p>
                    </div>
                )}
                {qrError && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">{qrError}</p>
                    </div>
                )}

                {/* Risk level — compact 3-up grid */}
                <Field label="Tingkat Risiko" error={errors.risk_level}>
                    <div className="grid grid-cols-3 gap-2">
                        {RISKS.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => set("risk_level", r.value)}
                                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 transition-all duration-150 ${
                                    form.risk_level === r.value
                                        ? `${r.border} ${r.bg}`
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                    form.risk_level === r.value ? r.dot : "bg-slate-200"
                                }`} />
                                <span className={`text-xs font-semibold ${
                                    form.risk_level === r.value ? r.color : "text-slate-500"
                                }`}>
                                    {r.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* deskripsi level yang sedang dipilih — biar tetap informatif tanpa makan tempat */}
                    {selectedRisk && (
                        <div className={`mt-2 flex items-start gap-2 rounded-xl px-3 py-2 ${selectedRisk.bg}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${selectedRisk.dot}`} />
                            <p className={`text-[11px] leading-relaxed ${selectedRisk.color}`}>
                                {selectedRisk.desc}
                            </p>
                        </div>
                    )}

                    {form.risk_level === "high" && (
                        <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-600 leading-relaxed">
                                Risiko tinggi langsung dieskalasi — tim terkait dihubungi dalam 1 jam.
                            </p>
                        </div>
                    )}
                </Field>

                {/* Description */}
                <Field label="Deskripsi" error={errors.description}>
                    <div className="relative">
                        <textarea
                            ref={descRef}
                            rows={4}
                            placeholder="cth. Ditemukan tumpahan cairan di dekat pintu masuk loading bay, lantai basah dan tidak ada rambu peringatan..."
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            className={`w-full rounded-xl border-2 px-3.5 py-3 text-sm text-slate-700 placeholder-slate-300 resize-none outline-none transition-colors leading-relaxed ${
                                errors.description
                                    ? "border-red-300 bg-red-50"
                                    : "border-slate-200 bg-white focus:border-slate-400"
                            }`}
                        />
                        <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-300">
                            {form.description.length}
                        </div>
                    </div>
                </Field>

                {/* Location + Department — 1 row on wider screens, stacked on small */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                        icon={MapPin}
                        label="Lokasi"
                        optional={!prefilledFromQR.location}
                    >
                        {loadingMeta ? (
                            <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
                        ) : (
                            <>
                                {prefilledFromQR.location && (
                                    <div className="flex items-center gap-1 mb-1.5">
                                        <QrCode className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[10px] text-emerald-600 font-medium">
                                            Otomatis dari QR code
                                        </span>
                                    </div>
                                )}
                                <select
                                    value={form.location_id ?? ""}
                                    onChange={(e) =>
                                        set("location_id", e.target.value ? Number(e.target.value) : undefined)
                                    }
                                    className={`w-full rounded-xl border-2 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 transition-colors appearance-none ${
                                        prefilledFromQR.location ? "border-emerald-200" : "border-slate-200"
                                    }`}
                                >
                                    <option value="">Pilih lokasi...</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.area_name}{l.site ? ` · ${l.site}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                    </Field>

                    <Field
                        icon={Building2}
                        label="Departemen"
                        optional={!prefilledFromQR.department}
                    >
                        {loadingMeta ? (
                            <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
                        ) : (
                            <>
                                {prefilledFromQR.department && (
                                    <div className="flex items-center gap-1 mb-1.5">
                                        <QrCode className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[10px] text-emerald-600 font-medium">
                                            Otomatis dari QR code
                                        </span>
                                    </div>
                                )}
                                <select
                                    value={form.department_id ?? ""}
                                    onChange={(e) =>
                                        set("department_id", e.target.value ? Number(e.target.value) : undefined)
                                    }
                                    className={`w-full rounded-xl border-2 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 transition-colors appearance-none ${
                                        prefilledFromQR.department ? "border-emerald-200" : "border-slate-200"
                                    }`}
                                >
                                    <option value="">Pilih departemen...</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}{d.site ? ` · ${d.site}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                    </Field>
                </div>

                {/* Reporter name */}
                <Field icon={User} label="Nama Pelapor" optional>
                    <input
                        type="text"
                        placeholder="Anonim jika dikosongkan"
                        value={form.reporter_name}
                        onChange={(e) => set("reporter_name", e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-slate-400 transition-colors"
                    />
                </Field>

                {/* Upload foto */}
                <Field icon={ImagePlus} label="Foto" optional>
                    {entries.length > 0 && (
                        <div className="space-y-2 mb-2.5">
                            {entries.map((e, i) => (
                                <FileItem
                                    key={`${e.file.name}-${e.file.size}-${i}`}
                                    file={e.file}
                                    preview={e.preview}
                                    watermarked={e.watermarked}
                                    onRemove={() => removeEntry(i)}
                                />
                            ))}
                        </div>
                    )}

                    {canAddMore && (
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => validateAndAdd(e.target.files, true)}
                                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                            />
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept={ALLOWED_MIME.join(",")}
                                multiple
                                className="hidden"
                                onChange={(e) => validateAndAdd(e.target.files, false)}
                                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                            />

                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={processingCamera}
                                className="flex flex-col items-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl py-3 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                {processingCamera ? (
                                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                ) : (
                                    <Camera className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="text-[11px] text-slate-500 font-medium">
                                    {processingCamera ? "Memproses..." : "Ambil Foto"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => galleryInputRef.current?.click()}
                                disabled={processingCamera}
                                className="flex flex-col items-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl py-3 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                <ImagePlus className="w-4 h-4 text-slate-400" />
                                <span className="text-[11px] text-slate-500 font-medium">Pilih Galeri</span>
                            </button>
                        </div>
                    )}

                    <p className="text-[10px] text-slate-300 mt-1.5 text-center">
                        {!canAddMore
                            ? `Batas ${MAX_FILES} foto tercapai`
                            : `${entries.length}/${MAX_FILES} foto · maks ${MAX_FILE_SIZE_MB}MB · ${ALLOWED_LABEL}`}
                    </p>

                    {fileError && <p className="text-xs text-red-500 mt-1.5 px-1">{fileError}</p>}
                </Field>

                {submitError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{submitError}</p>
                    </div>
                )}
            </div>

            {/* ── Sticky bottom CTA ── */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3.5">
                <button
                    onClick={submit}
                    disabled={submitting || processingCamera}
                    className="w-full py-3.5 rounded-2xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Mengirim...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4" />
                            Kirim Laporan
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ── Suspense wrapper ─────────────────────────────────────────────────────────
// useSearchParams() butuh Suspense boundary di Next.js App Router, karena
// halaman ini bisa diakses langsung lewat link QR (?qr=<token>) yang
// memerlukan client-side query param pada initial render.

export default function DeclarePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                </div>
            }
        >
            <DeclareForm />
        </Suspense>
    );
}