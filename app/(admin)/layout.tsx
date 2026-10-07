/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Paperclip,
  List,
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

/* ========================================================================
   TYPES
======================================================================== */

type Role = "admin" | "pic" | "hod";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles: readonly Role[];
};

type NavGroup = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: readonly Role[];
  children: readonly NavItem[];
};

type NavigationItem = NavItem | NavGroup;

/* ========================================================================
   CONSTANTS
======================================================================== */

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  pic: "PIC",
  hod: "Head of Dept",
};

const LOGO_SRC = "/branding/yusen_logo.png";

/* ========================================================================
   NAVIGATION
======================================================================== */

const NAV_ITEMS: readonly NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "pic", "hod"],
  },

  {
    label: "Reports",
    // href: "/reports",
    icon: FileWarning,
    roles: ["admin", "pic", "hod"],
    children: [
      {
        label: "List Reports",
        href: "/reports",
        icon: List,
        roles: ["admin", "pic", "hod"],
      },
    ],
  },

  {
    label: "Master Data",
    icon: Database,
    roles: ["admin", "pic"],
    children: [
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
        roles: ["admin", "pic"],
      },
      {
        label: "Locations",
        href: "/locations",
        icon: MapPin,
        roles: ["admin", "pic"],
      },
    ],
  },
];

/* ========================================================================
   TYPE GUARDS
======================================================================== */

function isNavGroup(item: NavigationItem): item is NavGroup {
  return "children" in item;
}

/* ========================================================================
   HELPERS
======================================================================== */

function getRoleLabel(role?: string): string {
  if (!role) {
    return "—";
  }

  if (role === "admin" || role === "pic" || role === "hod") {
    return ROLE_LABEL[role];
  }

  return role;
}

function isValidRole(role?: string): role is Role {
  return role === "admin" || role === "pic" || role === "hod";
}

/* ========================================================================
   SIDEBAR CONTENT
======================================================================== */

type SidebarContentProps = {
  mobile?: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  masterDataOpen: boolean;
  setMasterDataOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filteredNav: readonly NavigationItem[];
  pathname: string;
  initials: string;
  userName?: string;
  userRole?: string;
  handleLogout: () => void;
};

function SidebarContent({
  mobile = false,
  sidebarOpen,
  setSidebarOpen,
  masterDataOpen,
  setMasterDataOpen,
  filteredNav,
  pathname,
  initials,
  userName,
  userRole,
  handleLogout,
}: SidebarContentProps) {
  const isActive = (href: string): boolean =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  const isGroupActive = (children: readonly NavItem[]): boolean =>
    children.some((child) => isActive(child.href));

  return (
    <div className="flex h-full flex-col">
      {/* ================================================================
          SIDEBAR HEADER
      ================================================================ */}

      <div className="flex h-16 shrink-0 items-center border-b border-slate-700/80 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-slate-800 px-1.5">
            <img
              src={LOGO_SRC}
              alt="Yusen Logistics"
              className="h-7 w-auto object-contain"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Yusen Logistics
            </p>

            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Safety Management
            </p>
          </div>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ================================================================
          NAVIGATION
      ================================================================ */}

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-2 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Main Menu
          </span>
        </div>

        <nav className="space-y-1" aria-label="Main navigation">
          {filteredNav.map((item) => {
            /* ==========================================================
               GROUP
            ========================================================== */

            if (isNavGroup(item)) {
              if (item.children.length === 0) {
                return null;
              }

              const active = isGroupActive(item.children);

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setMasterDataOpen((value) => !value)
                    }
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-sky-500/10 text-white"
                        : "text-slate-300 hover:bg-slate-700/70 hover:text-white"
                    )}
                    aria-expanded={masterDataOpen}
                  >
                    <span
                      className={cn(
                        "absolute left-0 h-8 w-0.5 rounded-r-full",
                        active ? "bg-sky-400" : "bg-transparent"
                      )}
                    />

                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        active
                          ? "text-sky-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />

                    <span className="flex-1 text-left">
                      {item.label}
                    </span>

                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
                        masterDataOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {masterDataOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                      {item.children.map((child) => {
                        const childActive = isActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                              childActive
                                ? "bg-sky-500/10 font-medium text-white"
                                : "text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
                            )}
                          >
                            <child.icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                childActive
                                  ? "text-sky-400"
                                  : "text-slate-500 group-hover:text-slate-300"
                              )}
                            />

                            <span className="flex-1">
                              {child.label}
                            </span>

                            {childActive && (
                              <ChevronRight className="h-3.5 w-3.5 text-sky-400" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ==========================================================
               SIMPLE ITEM
            ========================================================== */

            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-sky-500/10 text-white"
                    : "text-slate-300 hover:bg-slate-700/70 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 h-8 w-0.5 rounded-r-full",
                    active ? "bg-sky-400" : "bg-transparent"
                  )}
                />

                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active
                      ? "text-sky-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                />

                <span className="flex-1">
                  {item.label}
                </span>

                {active && (
                  <ChevronRight className="h-4 w-4 text-sky-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ================================================================
          SIDEBAR FOOTER / USER
      ================================================================ */}

      <div className="shrink-0 border-t border-slate-700/80 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-700/70"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-sky-600 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {userName ?? "—"}
                </p>

                <p className="truncate text-[11px] text-slate-400">
                  {getRoleLabel(userRole)}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="end"
            className="mb-1 w-56"
          >
            <DropdownMenuLabel>
              <p className="font-medium">{userName ?? "—"}</p>

              <p className="text-xs font-normal text-slate-400">
                {getRoleLabel(userRole)}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ========================================================================
   TOP USER MENU
======================================================================== */

type UserMenuProps = {
  userName?: string;
  userRole?: string;
  initials: string;
  handleLogout: () => void;
};

function UserMenu({
  userName,
  userRole,
  initials,
  handleLogout,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sky-600 text-[11px] font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="hidden text-left sm:block">
            <p className="max-w-[160px] truncate text-xs font-semibold text-slate-700">
              {userName ?? "—"}
            </p>

            <p className="text-[10px] text-slate-400">
              {getRoleLabel(userRole)}
            </p>
          </div>

          <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        className="w-56"
      >
        <DropdownMenuLabel>
          <p className="font-medium">{userName ?? "—"}</p>

          <p className="text-xs font-normal text-slate-400">
            {getRoleLabel(userRole)}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ========================================================================
   MAIN LAYOUT
======================================================================== */

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, hydrate, logout } = useAuthStore();

  /* ----------------------------------------------------------------------
     STATE
  ---------------------------------------------------------------------- */

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  /* ----------------------------------------------------------------------
     HYDRATE AUTH
  ---------------------------------------------------------------------- */

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /* ----------------------------------------------------------------------
     CLOSE MOBILE SIDEBAR WHEN ROUTE CHANGES
  ---------------------------------------------------------------------- */

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /* ----------------------------------------------------------------------
     AUTO OPEN MASTER DATA WHEN CHILD IS ACTIVE
  ---------------------------------------------------------------------- */

  useEffect(() => {
    const masterData = NAV_ITEMS.find(
      (item): item is NavGroup =>
        isNavGroup(item) && item.label === "Master Data"
    );

    if (!masterData) {
      return;
    }

    const active = masterData.children.some(
      (child) =>
        pathname === child.href ||
        pathname.startsWith(`${child.href}/`)
    );

    if (active) {
      setMasterDataOpen(true);
    }
  }, [pathname]);

  /* ----------------------------------------------------------------------
     LOGOUT
  ---------------------------------------------------------------------- */

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  /* ----------------------------------------------------------------------
     USER INFORMATION
  ---------------------------------------------------------------------- */

  const userRole = user?.role;

  /* ----------------------------------------------------------------------
     FILTER NAVIGATION BY ROLE
  ---------------------------------------------------------------------- */

  const filteredNav = NAV_ITEMS.reduce<NavigationItem[]>(
    (result, item) => {
      /*
       * If role is unknown, don't hide navigation.
       * This prevents the UI from disappearing while auth is hydrating.
       */
      if (!user || !isValidRole(userRole)) {
        result.push(item);
        return result;
      }

      if (!item.roles.includes(userRole)) {
        return result;
      }

      if (isNavGroup(item)) {
        const children = item.children.filter((child) =>
          child.roles.includes(userRole)
        );

        if (children.length > 0) {
          result.push({
            ...item,
            children,
          });
        }

        return result;
      }

      result.push(item);

      return result;
    },
    []
  );

  /* ----------------------------------------------------------------------
     ACTIVE CHECK
  ---------------------------------------------------------------------- */

  const isActive = (href: string): boolean =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  /* ----------------------------------------------------------------------
     ACTIVE BREADCRUMB
  ---------------------------------------------------------------------- */

  const activeLabel = (() => {
    for (const item of filteredNav) {
      if (!isNavGroup(item) && isActive(item.href)) {
        return item.label;
      }

      if (isNavGroup(item)) {
        const child = item.children.find((childItem) =>
          isActive(childItem.href)
        );

        if (child) {
          return `${item.label} / ${child.label}`;
        }
      }
    }

    const segment = pathname.split("/").filter(Boolean)[0];

    if (!segment) {
      return "Dashboard";
    }

    return segment
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  })();

  /* ----------------------------------------------------------------------
     INITIALS
  ---------------------------------------------------------------------- */

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
    : "?";

  /* ======================================================================
     RENDER
  ====================================================================== */

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ==================================================================
          DESKTOP SIDEBAR
      ================================================================== */}

      <aside className="hidden w-64 shrink-0 bg-slate-800 lg:block">
        <SidebarContent
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          masterDataOpen={masterDataOpen}
          setMasterDataOpen={setMasterDataOpen}
          filteredNav={filteredNav}
          pathname={pathname}
          initials={initials}
          userName={user?.name}
          userRole={user?.role}
          handleLogout={handleLogout}
        />
      </aside>

      {/* ==================================================================
          MOBILE OVERLAY
      ================================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ==================================================================
          MOBILE SIDEBAR
      ================================================================== */}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-slate-800 shadow-2xl transition-transform duration-200 lg:hidden",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        )}
        aria-label="Mobile navigation"
      >
        <SidebarContent
          mobile
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          masterDataOpen={masterDataOpen}
          setMasterDataOpen={setMasterDataOpen}
          filteredNav={filteredNav}
          pathname={pathname}
          initials={initials}
          userName={user?.name}
          userRole={user?.role}
          handleLogout={handleLogout}
        />
      </aside>

      {/* ==================================================================
          MAIN AREA
      ================================================================== */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ================================================================
            TOP HEADER
        ================================================================ */}

        <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-5">
          {/* Mobile hamburger */}

          <button
            type="button"
            onClick={() =>
              setSidebarOpen((value) => !value)
            }
            className="mr-3 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label={
              sidebarOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* ==============================================================
              PAGE TITLE / BREADCRUMB
          ============================================================== */}

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <ShieldCheck className="h-4 w-4 text-sky-600" />

              <span className="text-xs font-medium text-slate-400">
                Safety Management System
              </span>

              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            </div>

            <span className="truncate text-sm font-semibold text-slate-700">
              {activeLabel}
            </span>
          </div>

          {/* ==============================================================
              RIGHT USER AREA
          ============================================================== */}

          <div className="ml-auto flex items-center gap-2">
            <UserMenu
              userName={user?.name}
              userRole={user?.role}
              initials={initials}
              handleLogout={handleLogout}
            />
          </div>
        </header>

        {/* ================================================================
            PAGE CONTENT
        ================================================================ */}

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}