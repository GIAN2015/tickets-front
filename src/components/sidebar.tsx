// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { Menu, X, Users, LayoutGrid, UserPlus, PlusSquare, ClipboardList, LogOut } from "lucide-react";

export default function Sidebar() {
  const rawPath = usePathname();
  const [open, setOpen] = useState(false);

  if (!rawPath) return null; // defensivo
  if (rawPath === "/login") return null;

  const pathname = rawPath.replace(/\/+$/, "") || "/";

  const isUsuarios = pathname === "/usuarios" || pathname.startsWith("/usuarios/");
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isRegistro = pathname === "/registro" || pathname.startsWith("/registro/");
  const isTicketsNew = pathname === "/tickets/new";
  let isMisTickets =
    pathname === "/tickets" ||
    (pathname.startsWith("/tickets/") && !pathname.startsWith("/tickets/new"));

  
  if (isTicketsNew) isMisTickets = false;

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

      {/* Sidebar / slide-over */}
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
            <li>
              <Link
                href="/usuarios"
                onClick={() => setOpen(false)}
                aria-current={isUsuarios ? "page" : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isUsuarios ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Users className={`w-4 h-4 ${isUsuarios ? "text-sky-600" : "text-slate-400"}`} />
                Usuarios
              </Link>
            </li>

            <li>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                aria-current={isDashboard ? "page" : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isDashboard ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <LayoutGrid className={`w-4 h-4 ${isDashboard ? "text-sky-600" : "text-slate-400"}`} />
                Dashboard
              </Link>
            </li>

            <li>
              <Link
                href="/registro"
                onClick={() => setOpen(false)}
                aria-current={isRegistro ? "page" : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isRegistro ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <UserPlus className={`w-4 h-4 ${isRegistro ? "text-sky-600" : "text-slate-400"}`} />
                Registro
              </Link>
            </li>

            <li>
              <Link
                href="/tickets/new"
                onClick={() => setOpen(false)}
                aria-current={isTicketsNew ? "page" : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isTicketsNew ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <PlusSquare className={`w-4 h-4 ${isTicketsNew ? "text-sky-600" : "text-slate-400"}`} />
                Nuevo Ticket
              </Link>
            </li>

            <li>
              <Link
                href="/tickets"
                onClick={() => setOpen(false)}
                aria-current={isMisTickets ? "page" : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isMisTickets ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ClipboardList className={`w-4 h-4 ${isMisTickets ? "text-sky-600" : "text-slate-400"}`} />
                Mis Tickets
              </Link>
            </li>
          </ul>

          {/* Logout at bottom */}
          <div className="border-t border-slate-100 mt-4 pt-4">
            <div className="px-3">

                <LogoutButton />
            </div>
          </div>
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
