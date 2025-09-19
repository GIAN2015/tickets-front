"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { User, Settings, ClipboardList, ChevronDown } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [nombreEmpresa, setNombreEmpresa] = useState<string | null>(null);
  const [usuarioNombre, setUsuarioNombre] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedNombre = localStorage.getItem("Nombre_empresa");
    const storedUser =
    localStorage.getItem("userName");
    const storedRole = localStorage.getItem("role") || null;
    const storedRoleUpper = storedRole ? storedRole.toUpperCase() : null;

    setNombreEmpresa(storedNombre);
    setUsuarioNombre(storedUser);
    setRole(storedRoleUpper);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (pathname === "/login") return null;

  const leftText = nombreEmpresa ? (
    <div className="text-sm text-slate-700">
      Bienvenido,{" "}
      <span className="font-semibold text-slate-900">{nombreEmpresa}</span>
    </div>
  ) : (
    <div className="text-sm text-slate-700">Bienvenido</div>
  );

  const displayName = usuarioNombre || "Mi cuenta";

  return (
    <header className="w-full bg-white border-b border-slate-100">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* LEFT: icono + Bienvenido + nombre empresa */}
        <div className="flex items-center gap-3">
          {/* ICONO ESTÁTICO (no es botón ni link) */}
          <div
            aria-hidden
            className="w-10 h-10 flex items-center justify-center rounded-md bg-gradient-to-r from-sky-600 to-slate-700 text-white"
            title="Empresa"
          >
            {/* icono de edificio simplificado */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 21h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 21V5a1 1 0 00-1-1h-4V3H8v1H4a1 1 0 00-1 1v16" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 10h2M7 14h2M7 6h2M11 6h2M11 10h2M11 14h2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* texto de bienvenida */}
          <div>{leftText}</div>
        </div>

        {/* RIGHT: usuario (avatar + dropdown) */}
        <div className="flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="inline-flex items-center gap-3 rounded-full px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm bg-gradient-to-r from-sky-600 to-slate-700 shadow-sm">
                <User className="w-4 h-4" />
              </div>

              <span className="hidden sm:inline-flex flex-col text-left">
                <span className="text-sm font-medium text-slate-800 leading-tight">{displayName}</span>
                {role && <span className="text-xs text-slate-500">{role}</span>}
              </span>

              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
            </button>

            {/* Dropdown */}
            <div
              role="menu"
              aria-orientation="vertical"
              aria-hidden={!open}
              className={`origin-top-right z-40 absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-100 shadow-lg overflow-hidden transform transition-all ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
            >
              <div className="py-2">
                {/* Cabecera del dropdown: nombre de usuario grande */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-800">{displayName}</div>
                  {nombreEmpresa && <div className="text-xs text-slate-500">{nombreEmpresa}</div>}
                </div>

                <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <User className="w-4 h-4 text-slate-400" />
                  Perfil
                </Link>

                <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="w-4 h-4 text-slate-400" />
                  Configuración
                </Link>

                <Link href="/tickets" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  Mis Tickets
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <div className="px-3 py-2">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
