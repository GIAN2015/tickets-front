"use client";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Ocultar en login
  if (pathname === "/login") return null;

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            Sistema de Tickets
          </span>
        </p>
        <p className="mt-2 sm:mt-0">
          Desarrollado por{" "}
          <span className="font-medium text-sky-600 dark:text-sky-400">
            Danyris
          </span>
        </p>
      </div>
    </footer>
  );
}
