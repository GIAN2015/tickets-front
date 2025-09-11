"use client";
import { usePathname } from "next/navigation";

export default function Footer() {

    const pathname = usePathname();
    
    if (pathname === '/login') {
        return null;
    }
  return (
    <footer className="bg-gray-800 text-gray-200 text-center py-4">
      <p className="text-sm">
        © {new Date().getFullYear()} Sistema de Tickets — Desarrollado Por Danyris
      </p>
    </footer>
  );
}
