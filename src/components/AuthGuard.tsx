"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type TokenPayload = {
  sub: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
};

function parseJwt(token: string): TokenPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function normalize(pattern: string) {
  if (!pattern) return "/";
  return pattern.startsWith("/") ? pattern : `/${pattern}`;
}

function matches(pattern: string, pathname: string) {
  const p = normalize(pattern);
  return pathname === p || pathname.startsWith(p + "/");
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();


  const prevPathRef = useRef<string | null>(null);


  const publicRoutes = ["/login"];
  const roleRoutes: Record<string, string[]> = {
    admin: ["/usuarios", "/register-admin","/registro"],
    user: ["/dashboard", "/tickets"],
    ti: ["/dashboard", "/registro", "/tickets"],
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token && !publicRoutes.includes(pathname)) {
      alert("No has iniciado sesión. Por favor inicia sesión para continuar.");
      router.replace("/login");
      return;
    }

    if (token) {
      const decoded = parseJwt(token);

      if (!decoded || decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
        router.replace("/login");
        return;
      }

      const userRole = decoded.role;
      const allowedPatterns = roleRoutes[userRole] || [];

      const permitted =
        publicRoutes.includes(pathname) ||
        allowedPatterns.some((pat) => matches(pat, pathname));

      if (!permitted) {

        alert("No tienes permisos para acceder a esta página.");

        const prev = prevPathRef.current;

        if (prev && prev !== pathname) {
          try {
            router.push(prev);
          } catch {

            router.back();
          }
        } else {

          router.replace("/login");
        }
      }
    }
  }, [pathname, router]);


  useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  return <>{children}</>;
}
