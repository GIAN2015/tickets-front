import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton"; // 👈 importa aquí

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Tickets",
  description: "Gestión de tickets con roles y control de flujo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 text-gray-900`}
      >
        {/* Header */}
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
              <LogoutButton /> {/* 👈 botón cliente */}
            </nav>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="container mx-auto px-6 py-8 min-h-[80vh]">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-200 text-center py-4 mt-10">
          <p className="text-sm">
            © {new Date().getFullYear()} Sistema de Tickets — Desarrollado Por Danyris
          </p>
        </footer>
      </body>
    </html>
  );
}
