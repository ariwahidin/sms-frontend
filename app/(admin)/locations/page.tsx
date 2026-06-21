/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, MapPin, RefreshCw, X, Loader2, AlertTriangle, QrCode, Building2, Pencil, Download, Printer } from "lucide-react";
import QRCode from "qrcode";
import api from "@/lib/api";
import type { Location, Department, CreateLocationPayload } from "@/types/api";
import { formatDate } from "@/lib/utils";

// ── QR rendering ──────────────────────────────────────────────────────────────
// Di-generate di browser (library `qrcode`), bukan lewat layanan eksternal —
// supaya tidak bergantung pada koneksi ke pihak ketiga saat mencetak label,
// dan hasilnya bisa langsung dipakai sebagai <img> data URL untuk preview,
// download, maupun print.

const QR_PIXEL_SIZE = 480; // resolusi tinggi supaya tetap tajam saat dicetak

async function buildQrDataUrl(token: string): Promise<string> {
    const url = `${window.location.origin}/declare?qr=${token}`;
    return QRCode.toDataURL(url, {
        width: QR_PIXEL_SIZE,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#1e293b", light: "#ffffff" },
    });
}

function QRModal({ location, onClose }: { location: Location; onClose: () => void }) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [mode, setMode] = useState<"preview" | "print">("preview");
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        buildQrDataUrl(location.qr_token).then((url) => {
            if (!cancelled) setDataUrl(url);
        });
        return () => {
            cancelled = true;
        };
    }, [location.qr_token]);

    const handleDownload = () => {
        if (!dataUrl) return;
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `qr-${location.site}-${location.area_name}`.toLowerCase().replace(/\s+/g, "-") + ".png";
        a.click();
    };

    const handlePrint = () => {
        setMode("print");
        // beri waktu render label sebelum membuka dialog print
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
                setMode("preview");
            });
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 print:bg-white print:static print:p-0">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 text-center print:hidden">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-800">QR Code</p>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                    {location.area_name} · {location.site}
                </p>

                {dataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={dataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border border-slate-100" />
                ) : (
                    <div className="w-48 h-48 mx-auto rounded-xl border border-slate-100 flex items-center justify-center bg-slate-50">
                        <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                    </div>
                )}

                <p className="text-[10px] text-slate-400 mt-3 font-mono break-all">{location.qr_token}</p>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleDownload}
                        disabled={!dataUrl}
                        className="flex-1 py-2.5 text-xs text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download PNG
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={!dataUrl}
                        className="flex-1 py-2.5 text-xs text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Print Label
                    </button>
                </div>
            </div>

            {/* ── Print layout — tersembunyi di layar, hanya muncul saat print ── */}
            {/* Pakai CSS @media print agar isi modal lain (yang sudah di-mark
                print:hidden) tidak ikut tercetak, dan label ini satu-satunya
                yang dikirim ke printer. */}
            <div ref={printRef} className="hidden print:block print-label">
                {dataUrl && (
                    <div className="print-label-card">
                        <p className="print-label-company">PT YUSEN LOGISTICS INTERLINK INDONESIA</p>
                        <img src={dataUrl} alt="QR Code" className="print-label-qr" />
                        <p className="print-label-area">{location.area_name}</p>
                        <p className="print-label-site">{location.site}</p>
                        <p className="print-label-instruction">
                            Scan to report a safety risk at this location
                        </p>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-label,
                    .print-label * {
                        visibility: visible;
                    }
                    .print-label {
                        position: fixed;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .print-label-card {
                        width: 90mm;
                        padding: 8mm;
                        border: 2px solid #1e293b;
                        border-radius: 4mm;
                        text-align: center;
                        font-family: Arial, sans-serif;
                    }
                    .print-label-company {
                        font-size: 10pt;
                        font-weight: 700;
                        letter-spacing: 0.05em;
                        color: #1e293b;
                        margin: 0 0 4mm 0;
                    }
                    .print-label-qr {
                        width: 50mm;
                        height: 50mm;
                        margin: 0 auto;
                        display: block;
                    }
                    .print-label-area {
                        font-size: 13pt;
                        font-weight: 700;
                        color: #1e293b;
                        margin: 4mm 0 0 0;
                    }
                    .print-label-site {
                        font-size: 9pt;
                        color: #475569;
                        margin: 1mm 0 0 0;
                    }
                    .print-label-instruction {
                        font-size: 7.5pt;
                        color: #64748b;
                        margin: 3mm 0 0 0;
                    }
                }
            `}</style>
        </div>
    );
}

// ── Form modal — satu komponen, dua mode (create / edit) ───────────────────────
// Mode ditentukan oleh ada-tidaknya prop `location`: undefined → create,
// terisi → edit (form di-prefill dari data lokasi tersebut).

function LocationFormModal({
    location,
    departments,
    onClose,
    onSaved,
}: {
    location?: Location;
    departments: Department[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!location;

    const [form, setForm] = useState<CreateLocationPayload>({
        site: location?.site ?? "",
        area_name: location?.area_name ?? "",
        department_id: location?.department_id,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = <K extends keyof CreateLocationPayload>(k: K, v: CreateLocationPayload[K]) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => ({ ...p, [k]: "" }));
    };

    const submit = async () => {
        const errs: Record<string, string> = {};
        if (!form.site.trim()) errs.site = "Site is required";
        if (!form.area_name.trim()) errs.area_name = "Area name is required";
        if (!form.department_id) errs.department_id = "Responsible department is required";
        if (Object.keys(errs).length) return setErrors(errs);

        setLoading(true);
        setError(null);
        try {
            if (isEdit) {
                await api.patch(`/locations/${location.id}`, form);
            } else {
                await api.post("/locations", form);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error ?? `Failed to ${isEdit ? "update" : "create"} location`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-800">
                        {isEdit ? "Edit Location" : "New Location"}
                    </p>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Site *</label>
                        <input
                            type="text"
                            placeholder="e.g. Jakarta HQ"
                            value={form.site}
                            onChange={(e) => set("site", e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                errors.site ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-slate-400"
                            }`}
                        />
                        {errors.site && <p className="text-xs text-red-500 mt-1">{errors.site}</p>}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Area Name *</label>
                        <input
                            type="text"
                            placeholder="e.g. Loading Bay A"
                            value={form.area_name}
                            onChange={(e) => set("area_name", e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                errors.area_name ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-slate-400"
                            }`}
                        />
                        {errors.area_name && <p className="text-xs text-red-500 mt-1">{errors.area_name}</p>}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">
                            Responsible Department *
                        </label>
                        <select
                            value={form.department_id ?? ""}
                            onChange={(e) =>
                                set("department_id", e.target.value ? Number(e.target.value) : undefined)
                            }
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors appearance-none bg-white ${
                                errors.department_id ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-slate-400"
                            }`}
                        >
                            <option value="">Select department...</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                    {d.site ? ` · ${d.site}` : ""}
                                </option>
                            ))}
                        </select>
                        {errors.department_id && (
                            <p className="text-xs text-red-500 mt-1">{errors.department_id}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                            Department that owns/is responsible for this area — auto-fills when this
                            location's QR is scanned.
                        </p>
                    </div>
                </div>

                {isEdit ? (
                    <p className="text-[10px] text-slate-400 mt-3 font-mono break-all">
                        QR token tidak berubah: {location.qr_token}
                    </p>
                ) : (
                    <p className="text-[10px] text-slate-400 mt-3">
                        A QR code will be auto-generated for this location.
                    </p>
                )}

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

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // null = modal tertutup, undefined = modal terbuka mode create,
    // Location = modal terbuka mode edit untuk lokasi tersebut
    const [formTarget, setFormTarget] = useState<Location | undefined | null>(null);
    const [qrLocation, setQrLocation] = useState<Location | null>(null);

    const fetchLocations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<Location[]>("/locations");
            setLocations(res.data);
        } catch {
            setLocations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await api.get<Department[]>("/departments");
            setDepartments(res.data);
        } catch {
            setDepartments([]);
        }
    }, []);

    useEffect(() => {
        fetchLocations();
        fetchDepartments();
    }, [fetchLocations, fetchDepartments]);

    return (
        <div className="px-6 py-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-slate-800">Locations</h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {loading ? "Loading..." : `${locations.length} location${locations.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLocations}
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
                        New Location
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Area</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-36">Site</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-44">Department</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-20">Status</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-36">Created</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-slate-50">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="h-3.5 bg-slate-100 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : locations.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <MapPin className="w-8 h-8 text-slate-300" />
                                        <p className="text-sm">No locations yet</p>
                                        <p className="text-xs">Create one to generate a QR code</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            locations.map((loc) => (
                                <tr key={loc.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-sm text-slate-700 font-medium">{loc.area_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{loc.site}</td>
                                    <td className="px-4 py-3">
                                        {loc.department ? (
                                            <span className="flex items-center gap-1.5 text-xs text-slate-600">
                                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                                {loc.department.name}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setFormTarget(loc)}
                                                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                                                title="Click to set the responsible department"
                                            >
                                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                                Not set
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                            loc.is_active
                                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                : "text-slate-500 bg-slate-50 border-slate-200"
                                        }`}>
                                            {loc.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(loc.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setFormTarget(loc)}
                                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setQrLocation(loc)}
                                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                                                title="View QR"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {formTarget !== null && (
                <LocationFormModal
                    location={formTarget}
                    departments={departments}
                    onClose={() => setFormTarget(null)}
                    onSaved={fetchLocations}
                />
            )}

            {qrLocation && (
                <QRModal location={qrLocation} onClose={() => setQrLocation(null)} />
            )}
        </div>
    );
}