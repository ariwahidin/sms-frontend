/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileWarning,
  Users,
  Building2,
  MapPin,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Database,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "pic", "hod"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileWarning,
    roles: ["admin", "pic", "hod"],
  },
  {
    label: "Master Data",
    icon: Database,
    roles: ["admin"],
    children: [
      { label: "Users", href: "/users", icon: Users, roles: ["admin"] },
      { label: "Departments", href: "/departments", icon: Building2, roles: ["admin"] },
      { label: "Locations", href: "/locations", icon: MapPin, roles: ["admin"] },
    ],
  },
] as const;

const ROLE_LABEL = { admin: "Administrator", pic: "PIC", hod: "Head of Dept" };

const LOGO_SRC = "/branding/yusen_logo.png";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrate, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMasterDataOpen, setMobileMasterDataOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // tutup drawer otomatis tiap kali pindah halaman
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // filter berdasarkan role, termasuk filter di dalam children grup
  const filteredNav = NAV_ITEMS.filter(
    (item) => !user || (item.roles as readonly string[]).includes(user.role)
  ).map((item) =>
    "children" in item
      ? {
        ...item,
        children: item.children.filter(
          (c) => !user || (c.roles as readonly string[]).includes(user.role)
        ),
      }
      : item
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  // grup aktif jika salah satu child-nya aktif
  const isGroupActive = (children: readonly { href: string }[]) =>
    children.some((c) => isActive(c.href));

  // label breadcrumb: cari di top-level dulu, lalu cari di dalam children
  const activeLabel = (() => {
    for (const item of filteredNav) {
      if ("href" in item && isActive(item.href)) return item.label;
      if ("children" in item) {
        const child = item.children.find((c) => isActive(c.href));
        if (child) return `${item.label} / ${child.label}`;
      }
    }
    return pathname.split("/")[1] || "Dashboard";
  })();

  const initials = user?.name
    ? user.name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
    : "?";

  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-800 px-4 sm:px-5">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          className="text-slate-300 hover:text-white lg:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileNavOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </button>

        {/* Logo + app name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-20 shrink-0 items-center justify-center rounded-md bg-white/10">
            {/* <ShieldCheck className="h-3.5 w-3.5 text-white" /> */}
            <img src={LOGO_SRC} alt="Yusen Logistics" className="h-7 w-auto" />
          </div>
          <span className="truncate text-sm font-semibold text-white">
            PT Yusen Logistics Interlink Indonesia <span className="hidden font-normal text-slate-400 sm:inline">— Safety Management System</span>
          </span>
        </div>

        {/* Right: user dropdown */}
        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/5 transition-colors">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-slate-600 text-[10px] text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-xs font-medium text-slate-200 sm:block">
                  {user?.name ?? "—"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                <p className="font-medium">{user?.name}</p>
                <p className="font-normal text-slate-400">
                  {user ? ROLE_LABEL[user.role] : "—"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Tab nav (desktop, horizontal) ───────────────────────────────── */}
      <nav className="hidden h-10 shrink-0 items-stretch border-b border-slate-200 bg-white px-3 lg:flex">
        {filteredNav.map((item) => {
          // ── Grouped item (Master Data): hover dropdown ──────────────────
          if ("children" in item) {
            if (item.children.length === 0) return null;
            const active = isGroupActive(item.children);
            return (
              <div key={item.label} className="group relative flex items-stretch">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3.5 text-xs font-medium transition-colors",
                    active
                      ? "border-sky-500 text-slate-800"
                      : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700"
                  )}
                >
                  <item.icon
                    className={cn("h-3.5 w-3.5", active ? "text-sky-600" : "text-slate-400")}
                  />
                  {item.label}
                  <ChevronDown className="h-3 w-3 text-slate-400 transition-transform group-hover:rotate-180" />
                </button>

                {/* dropdown panel — muncul saat group di-hover */}
                <div className="invisible absolute left-0 top-full z-30 min-w-[180px] rounded-b-md border border-slate-200 bg-white py-1 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                  {item.children.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors",
                          childActive
                            ? "bg-sky-50 text-slate-800"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        )}
                      >
                        <child.icon
                          className={cn("h-3.5 w-3.5", childActive ? "text-sky-600" : "text-slate-400")}
                        />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          // ── Simple item ──────────────────────────────────────────────────
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3.5 text-xs font-medium transition-colors",
                active
                  ? "border-sky-500 text-slate-800"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700"
              )}
            >
              <item.icon
                className={cn("h-3.5 w-3.5", active ? "text-sky-600" : "text-slate-400")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile nav drawer ────────────────────────────────────────────── */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/30 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="fixed inset-x-0 top-12 z-30 max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-slate-200 bg-white shadow-lg lg:hidden">
            {filteredNav.map((item) => {
              // ── Grouped item (Master Data): expand/collapse ──────────────
              if ("children" in item) {
                if (item.children.length === 0) return null;
                const active = isGroupActive(item.children);
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => setMobileMasterDataOpen((v) => !v)}
                      className={cn(
                        "flex w-full items-center gap-2.5 border-l-2 px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "border-sky-500 bg-sky-50 text-slate-800"
                          : "border-transparent text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <item.icon
                        className={cn("h-4 w-4", active ? "text-sky-600" : "text-slate-400")}
                      />
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "ml-auto h-3.5 w-3.5 text-slate-400 transition-transform",
                          mobileMasterDataOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {mobileMasterDataOpen && (
                      <div className="bg-slate-50/60">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2.5 border-l-2 py-2.5 pl-9 pr-4 text-sm font-medium transition-colors",
                                childActive
                                  ? "border-sky-500 bg-sky-50 text-slate-800"
                                  : "border-transparent text-slate-500 hover:bg-slate-100"
                              )}
                            >
                              <child.icon
                                className={cn("h-3.5 w-3.5", childActive ? "text-sky-600" : "text-slate-400")}
                              />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Simple item ──────────────────────────────────────────────
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 border-l-2 px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "border-sky-500 bg-sky-50 text-slate-800"
                      : "border-transparent text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4", active ? "text-sky-600" : "text-slate-400")}
                  />
                  {item.label}
                  {active && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* ── Breadcrumb row ───────────────────────────────────────────────── */}
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-4 text-xs text-slate-500 sm:px-5">
        <span className="text-slate-400">SMS</span>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="font-medium text-slate-700">{activeLabel}</span>
      </div>

      {/* ── Page content (unchanged) ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}