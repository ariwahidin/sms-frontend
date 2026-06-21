/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
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
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    roles: ["admin"],
  },
  {
    label: "Locations",
    href: "/locations",
    icon: MapPin,
    roles: ["admin"],
  },
];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const filteredNav = NAV_ITEMS.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  const initials = user?.name
    ? user.name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
    : "?";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Mobile overlay ───────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-56 flex flex-col bg-slate-800 transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            {/* <img
              src={LOGO_SRC}
              alt="Yusen Logistics"
              className="h-10 w-auto"
            /> */}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">SMS</p>
            <p className="text-slate-400 text-[10px] mt-0.5">Safety Management</p>
          </div>
          {/* Close btn mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="px-3 py-3 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/5 transition-colors text-left">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="bg-slate-600 text-white text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate leading-none">
                    {user?.name ?? "—"}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">
                    {user ? ROLE_LABEL[user.role] : "—"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 text-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-5 gap-3 shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-700 lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-400">SMS</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 font-medium capitalize">
              {pathname.split("/")[1] || "Dashboard"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">
              {user?.name}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
