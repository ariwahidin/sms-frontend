"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import api from "@/lib/api";
import type { DeclarePayload, Location, Department, RiskLevel } from "@/types/api";

// ── Risk options ──────────────────────────────────────────────────────────────

const RISKS: { value: RiskLevel; label: string; desc: string; color: string; bg: string; border: string }[] = [
    {
        value: "low",
        label: "Low",
        desc: "Minor impact, unlikely to escalate",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-300",
    },
    {
        value: "medium",
        label: "Medium",
        desc: "Moderate impact, needs attention",
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-300",
    },
    {
        value: "high",
        label: "High",
        desc: "Serious impact, urgent response needed",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-300",
    },
];

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDot({ active, done, n }: { active: boolean; done: boolean; n: number }) {
    return (
        <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                done
                    ? "bg-slate-800 text-white"
                    : active
                    ? "bg-slate-800 text-white ring-4 ring-slate-200"
                    : "bg-slate-100 text-slate-400"
            }`}
        >
            {done ? <CheckCircle2 className="w-4 h-4" /> : n}
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
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Report Submitted</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Your risk report has been received and is now pending classification.
                </p>
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-6 inline-block w-full">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Report Code</p>
                    <p className="font-mono text-2xl font-bold text-slate-800 tracking-widest">{code}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Save this for future reference</p>
                </div>
                <button
                    onClick={onNew}
                    className="w-full py-3 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                    Submit Another Report
                </button>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

export default function DeclarePage() {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(true);

    const [form, setForm] = useState<Partial<DeclarePayload>>({
        risk_level: "low",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successCode, setSuccessCode] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            api.get<Location[]>("/locations").catch(() => ({ data: [] })),
            api.get<Department[]>("/departments").catch(() => ({ data: [] })),
        ]).then(([loc, dept]) => {
            setLocations(loc.data);
            setDepartments(dept.data);
        }).finally(() => setLoadingMeta(false));
    }, []);

    const set = (key: keyof DeclarePayload, val: unknown) => {
        setForm((p) => ({ ...p, [key]: val }));
        setErrors((p) => ({ ...p, [key]: "" }));
    };

    // ── Validation per step ────────────────────────────────────────────────────

    const validateStep = (s: Step): boolean => {
        const errs: Record<string, string> = {};
        if (s === 1) {
            if (!form.risk_level) errs.risk_level = "Select a risk level";
        }
        if (s === 2) {
            if (!form.description?.trim()) errs.description = "Description is required";
            if (form.description && form.description.trim().length < 10)
                errs.description = "Please provide more detail (min 10 characters)";
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const next = () => {
        if (!validateStep(step)) return;
        setStep((s) => (s + 1) as Step);
    };

    const back = () => setStep((s) => (s - 1) as Step);

    const submit = async () => {
        if (!validateStep(3)) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const payload: DeclarePayload = {
                description: form.description!,
                risk_level: form.risk_level!,
                reporter_name: form.reporter_name || undefined,
                location_id: form.location_id || undefined,
                department_id: form.department_id || undefined,
            };
            const res = await api.post<{ code: string; id: number }>("/reports", payload);
            setSuccessCode(res.data.code);
        } catch (err: any) {
            setSubmitError(err?.response?.data?.error ?? "Failed to submit. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setForm({ risk_level: "low" });
        setErrors({});
        setSuccessCode(null);
        setSubmitError(null);
        setStep(1);
    };

    if (successCode) return <SuccessScreen code={successCode} onNew={reset} />;

    const steps = ["Risk Level", "Description", "Details"];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* ── Top bar ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => (step === 1 ? router.back() : back())}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Declare Risk Report</p>
                    <p className="text-[10px] text-slate-400">Step {step} of 3 — {steps[step - 1]}</p>
                </div>
            </div>

            {/* ── Step progress ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-0 max-w-sm mx-auto">
                    {steps.map((label, i) => (
                        <div key={i} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                                <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
                                <p className={`text-[9px] mt-1 font-medium whitespace-nowrap ${step === i + 1 ? "text-slate-700" : step > i + 1 ? "text-slate-500" : "text-slate-300"}`}>
                                    {label}
                                </p>
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-px mx-2 mb-3 transition-colors ${step > i + 1 ? "bg-slate-800" : "bg-slate-200"}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">

                {/* ── STEP 1: Risk Level ── */}
                {step === 1 && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-xl font-bold text-slate-800 mb-1">What's the risk level?</h1>
                            <p className="text-sm text-slate-400">
                                Choose based on the potential impact of this incident.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {RISKS.map((r) => (
                                <button
                                    key={r.value}
                                    onClick={() => set("risk_level", r.value)}
                                    className={`w-full text-left rounded-2xl border-2 px-5 py-4 transition-all duration-150 ${
                                        form.risk_level === r.value
                                            ? `${r.border} ${r.bg}`
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-sm font-semibold ${form.risk_level === r.value ? r.color : "text-slate-700"}`}>
                                                {r.label} Risk
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            form.risk_level === r.value ? `${r.border} ${r.bg}` : "border-slate-300"
                                        }`}>
                                            {form.risk_level === r.value && (
                                                <div className={`w-2.5 h-2.5 rounded-full ${r.value === "low" ? "bg-emerald-500" : r.value === "medium" ? "bg-amber-500" : "bg-red-500"}`} />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {errors.risk_level && (
                            <p className="text-xs text-red-500 mt-2">{errors.risk_level}</p>
                        )}

                        {form.risk_level === "high" && (
                            <div className="mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 leading-relaxed">
                                    High risk reports are escalated immediately. The relevant team will be notified within the hour.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 2: Description ── */}
                {step === 2 && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-xl font-bold text-slate-800 mb-1">Describe the incident</h1>
                            <p className="text-sm text-slate-400">
                                Be specific — include what happened, where, and any immediate risks.
                            </p>
                        </div>

                        <div className="mb-4">
                            <div className="relative">
                                <textarea
                                    rows={6}
                                    placeholder="e.g. A spill was found near the loading bay entrance. The floor was wet and no warning signs were placed..."
                                    value={form.description ?? ""}
                                    onChange={(e) => set("description", e.target.value)}
                                    className={`w-full rounded-2xl border-2 px-4 py-3.5 text-sm text-slate-700 placeholder-slate-300 resize-none outline-none transition-colors leading-relaxed ${
                                        errors.description
                                            ? "border-red-300 bg-red-50"
                                            : "border-slate-200 bg-white focus:border-slate-400"
                                    }`}
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] text-slate-300">
                                    {form.description?.length ?? 0} chars
                                </div>
                            </div>
                            {errors.description && (
                                <p className="text-xs text-red-500 mt-1.5 px-1">{errors.description}</p>
                            )}
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tips for a good report</p>
                            <ul className="space-y-1">
                                {["What exactly happened?", "Where did it occur?", "Who was involved or at risk?", "Any immediate actions taken?"].map((tip) => (
                                    <li key={tip} className="flex items-start gap-2 text-xs text-slate-400">
                                        <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-slate-300" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Details (optional) ── */}
                {step === 3 && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-xl font-bold text-slate-800 mb-1">Add details</h1>
                            <p className="text-sm text-slate-400">
                                Optional — helps route the report to the right team faster.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Reporter name */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                                    <User className="w-3.5 h-3.5" /> Your Name
                                    <span className="text-slate-300 font-normal">· optional</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Anonymous if left blank"
                                    value={form.reporter_name ?? ""}
                                    onChange={(e) => set("reporter_name", e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-slate-400 transition-colors"
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> Location
                                    <span className="text-slate-300 font-normal">· optional</span>
                                </label>
                                {loadingMeta ? (
                                    <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                                ) : (
                                    <select
                                        value={form.location_id ?? ""}
                                        onChange={(e) => set("location_id", e.target.value ? Number(e.target.value) : undefined)}
                                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 transition-colors appearance-none"
                                    >
                                        <option value="">Select location...</option>
                                        {locations.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.area_name} {l.site ? `· ${l.site}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Department */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                                    <Building2 className="w-3.5 h-3.5" /> Department
                                    <span className="text-slate-300 font-normal">· optional</span>
                                </label>
                                {loadingMeta ? (
                                    <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                                ) : (
                                    <select
                                        value={form.department_id ?? ""}
                                        onChange={(e) => set("department_id", e.target.value ? Number(e.target.value) : undefined)}
                                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 transition-colors appearance-none"
                                    >
                                        <option value="">Select department...</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} {d.site ? `· ${d.site}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Summary card */}
                        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Summary</p>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px] text-slate-400 w-20 shrink-0 pt-0.5">Risk</span>
                                    <span className={`text-xs font-semibold capitalize ${
                                        form.risk_level === "high" ? "text-red-600" :
                                        form.risk_level === "medium" ? "text-amber-600" : "text-emerald-600"
                                    }`}>{form.risk_level}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px] text-slate-400 w-20 shrink-0 pt-0.5">Description</span>
                                    <span className="text-xs text-slate-600 leading-relaxed line-clamp-2">{form.description}</span>
                                </div>
                                {form.reporter_name && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-[10px] text-slate-400 w-20 shrink-0 pt-0.5">Reporter</span>
                                        <span className="text-xs text-slate-600">{form.reporter_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {submitError && (
                            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600">{submitError}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Bottom CTA ── */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4">
                <button
                    onClick={step < 3 ? next : submit}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-2xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                        </>
                    ) : step < 3 ? (
                        <>
                            Continue
                            <ChevronRight className="w-4 h-4" />
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4" />
                            Submit Report
                        </>
                    )}
                </button>
                {step < 3 && (
                    <p className="text-center text-[10px] text-slate-300 mt-2">
                        {3 - step} step{3 - step !== 1 ? "s" : ""} remaining
                    </p>
                )}
            </div>
        </div>
    );
}