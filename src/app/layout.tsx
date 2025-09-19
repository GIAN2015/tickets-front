// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

import Footer from "@/components/Footer";
import ConditionalMain from "@/components/ConditionalMain";
import Sidebar from "@/components/sidebar";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Tickets",
  description: "Gestión de tickets con roles y control de flujo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 text-gray-900`}>
        <AuthGuard>
          {/* <-- contenedor flex: sidebar + contenido */}
          <div className="min-h-screen flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
              <Header />
              <ConditionalMain>{children}</ConditionalMain>
              <Footer />
            </div>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
