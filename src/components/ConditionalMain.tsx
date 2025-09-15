"use client";
import { usePathname } from "next/navigation";
import React from "react";

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideContainer = pathname === "/login";

  return (
    <main
      className={`flex-1 ${hideContainer ? "px-4 pt-6" : "px-6 py-8"}`}
    >
      <div className={hideContainer ? "" : "container mx-auto"}>
        {children}
      </div>
    </main>
  );
}
