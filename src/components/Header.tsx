"use client";

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { usePathname } from "next/navigation";

export default function Header() {
    const pathname = usePathname();

    if (pathname === '/login') {
        return null;
    }
    
  return (
    <header className="bg-blue-600 text-white py-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center px-6">
        <h1 className="text-xl font-bold">Sistema de Tickets</h1>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/tickets/new" className="hover:underline">
            Nuevo Ticket
          </Link>
          <Link href="/tickets" className="hover:underline">
            Mis Tickets
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
