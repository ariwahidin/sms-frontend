/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { LoginResponse } from "@/types/api";
import { cn } from "@/lib/utils";

// ── Branding assets ──────────────────────────────────────────────────────────
// GANTI path di bawah ini dengan foto operasional asli CL Group / Yusen
// Interlink Indonesia saat sudah tersedia. Taruh file di /public/branding/.
//
// BG_PHOTO     : foto besar full-bleed di belakang card login (gudang/armada)
// LOGO_SRC     : logo perusahaan, versi putih/terang untuk di atas navy
// FACILITY_NAME: nama site/fasilitas yang ditampilkan di pojok kanan bawah
//                foto (mis. "JAKARTA LOGISTICS CENTER"), kosongkan "" untuk
//                menyembunyikan.
const BG_PHOTO = "/branding/img-10.png";
const LOGO_SRC = "/branding/yusen_logo.png";
const FACILITY_NAME = "JAKARTA LOGISTICS CENTER";
const COMPANY_LINE = "PT Yusen Logistics Interlink Indonesia";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";
  const setAuth = useAuthStore((s) => s.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    try {
      const res = await api.post<LoginResponse>("/auth/login", values);
      setAuth(res.data.user, res.data.token);
      router.push(from);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Login failed. Please try again.";
      setServerError(msg);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900">
      {/* ── Full-bleed background photo ───────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_PHOTO})` }}
      />
      {/* darken/tint overlay so the card & top bar stay legible over any photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/30 to-slate-900/70" />
      <div className="absolute inset-0 bg-slate-900/20" />

      {/* ── Top brand masthead ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex h-20 items-center justify-between bg-slate-950/90 px-6 backdrop-blur-sm sm:px-10">
        <div className="flex items-center gap-3">
          {/* fallback mark in case LOGO_SRC isn't uploaded yet */}
          {/* <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-sky-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div> */}

          <img
            src={LOGO_SRC}
            alt="Yusen Logistics"
            className="h-10 w-auto"
          />
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-white">
              PT Yusen Logistics Interlink Indonesia
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300">
              Safety Management System
            </p>
          </div>
        </div>

        {/* facility tag, hidden on small screens to keep header compact */}
        {FACILITY_NAME && (
          <p className="hidden font-mono text-xs tracking-[0.3em] text-slate-300 sm:block">
            {FACILITY_NAME}
          </p>
        )}
      </header>

      {/* ── Login card, vertically centered over the photo ────────────────── */}
      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Glassmorphism card */}
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/15 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {/* Card header strip */}
            <div className="border-b border-white/10 bg-slate-950/40 px-8 py-6">
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-300" />
                <span className="text-sm font-semibold tracking-wide text-white">
                  SIGN IN
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                {`Please sign in with your account to continue.`}
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="username"
                    className="text-xs font-medium text-slate-200"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    autoComplete="username"
                    autoFocus
                    className={cn(
                      "h-10 border-white/20 bg-white/10 text-sm text-white placeholder:text-slate-400 focus-visible:border-sky-300 focus-visible:ring-sky-300/30",
                      errors.username &&
                      "border-red-300/60 focus-visible:ring-red-300/30"
                    )}
                    {...register("username")}
                  />
                  {errors.username && (
                    <p className="text-xs text-red-300">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs font-medium text-slate-200"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className={cn(
                        "h-10 border-white/20 bg-white/10 pr-9 text-sm text-white placeholder:text-slate-400 focus-visible:border-sky-300 focus-visible:ring-sky-300/30",
                        errors.password &&
                        "border-red-300/60 focus-visible:ring-red-300/30"
                      )}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-300">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Server error */}
                {serverError && (
                  <div className="rounded-md border border-red-300/30 bg-red-500/10 px-3 py-2">
                    <p className="text-xs text-red-200">{serverError}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className="mt-1 h-10 w-full bg-sky-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-slate-300">
            © {new Date().getFullYear()} Yusen Logistics Interlink Indonesia · All rights reserved
          </p>
        </div>
      </main>
    </div>
  );
}