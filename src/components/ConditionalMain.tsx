"use client";
import { usePathname } from "next/navigation";

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideContainer = pathname === "/login"; // ajustar según rutas

  return (
    <main className={ hideContainer ? "" : "container mx-auto px-6 py-8 min-h-[80vh]" }>
      {children}
    </main>
  );
}
