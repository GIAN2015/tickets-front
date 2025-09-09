import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton"; // 👈 importa aquí
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConditionalMain from "@/components/ConditionalMain";

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
        <AuthGuard>
        <Header />
        
        {/* Contenido principal */}
        <ConditionalMain>
          {children}
        </ConditionalMain>

        <Footer/>
        </AuthGuard>
      </body>
    </html>
  );
}
