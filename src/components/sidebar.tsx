// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { canSeeNavItem } from "@/components/AuthGuard";
import {
  Menu,
  X,
  Users,
  LayoutGrid,
  PlusSquare,
  ClipboardList,
  UserCheck, // 👈 Asignar Tickets
  BarChart3, // 👈 Métricas (nuevo)
} from "lucide-react";
import { useAuthStore } from "./useAuthStore";

type Role = "admin" | "user" | "ti" | "super-admi" | null;

export default function Sidebar() {
  const rawPath = usePathname();
  const [open, setOpen] = useState(false);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const userRole: Role =
    ((useAuthStore((s) => s.user?.role)?.toString().toLowerCase() as Role) ??
      null) as Role;

  const pathname = (rawPath?.replace(/\/+$/, "") || "/").toLowerCase();

  const isUsuarios = pathname === "/usuarios" || pathname.startsWith("/usuarios/");
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isTicketsNew = pathname === "/tickets/new";
  const isAsignar = pathname === "/tickets/asignar" || pathname.startsWith("/tickets/asignar/");
  const isMetricas = pathname === "/metricas" || pathname.startsWith("/metricas/"); // 👈 nuevo
  let isMisTickets =
    pathname === "/tickets" ||
    (pathname.startsWith("/tickets/") &&
      !pathname.startsWith("/tickets/new") &&
      !pathname.startsWith("/tickets/asignar"));
  if (isTicketsNew || isAsignar) isMisTickets = false;

  const navItems = [
    { href: "/usuarios", label: "Usuarios", icon: Users, isActive: isUsuarios },
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, isActive: isDashboard },

    // 👇 SOLO ADMIN
    { href: "/metricas", label: "Métricas", icon: BarChart3, isActive: isMetricas, allowedRoles: ["admin"] },

    {
      href: "/tickets/new",
      label: "Nuevo Ticket",
      icon: PlusSquare,
      isActive: isTicketsNew,
      allowedRoles: ["admin", "user"], // 👈 TI no lo ve
    },
    { href: "/tickets", label: "Mis Tickets", icon: ClipboardList, isActive: isMisTickets },
    {
      href: "/tickets/asignar",
      label: "Asignar Tickets",
      icon: UserCheck,
      isActive: isAsignar,
      allowedRoles: ["admin", "super-admi"], // 👈 solo admin/super
    },
  ];

  // 1) por rol
  const byRole = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    return userRole ? item.allowedRoles.includes(userRole) : false;
  });

  // 2) por guard adicional (si lo usas)
  const visibleItems = byRole.filter((item) => canSeeNavItem(userRole ?? null, item.href));

  const isLogin = pathname === "/login";
  const shouldHide =
    !hasHydrated || isLogin || !token || visibleItems.length === 0 || !rawPath;

  if (shouldHide) return null;

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((s) => !s)}
          className="p-2 rounded-md bg-white/95 shadow border border-slate-200"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-auto lg:transform-none
          w-64 lg:w-56`}
      >
        <nav className="h-full bg-white/95 border-r border-slate-200 px-4 py-6 flex flex-col">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-sky-600 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7a1 1 0 011-1h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 10h8M8 14h5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Sistema de Tickets</h3>
              <p className="text-xs text-slate-500">Panel</p>
            </div>
          </div>

          {/* Links */}
          <ul className="flex-1 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={item.isActive ? "page" : undefined}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                      item.isActive ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.isActive ? "text-sky-600" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
