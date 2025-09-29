// components/AuthGuard.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "./useAuthStore";


/* ========= Config única de accesos ========= */
export const publicRoutes = ["/login", "/register-admin"] as const;

export const roleRoutes: Record<string, string[]> = {
  "super-admi": ["/usuarios", "/dashboard", "/registro", "/tickets"], 
  admin: ["/usuarios", "/dashboard", "/registro", "/tickets"],                 // /usuarios y subrutas
  user: ["/dashboard", "/tickets"],
  ti: ["/dashboard", "/tickets"],
};

/* ========= Utilidades de matching ========= */
export function normalize(pattern: string) {
  if (!pattern) return "/";
  return pattern.startsWith("/") ? pattern : `/${pattern}`;
}

export function matches(pattern: string, pathname: string) {
  const p = normalize(pattern);
  const path = normalize(pathname);
  return path === p || path.startsWith(p + "/");
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  const path = normalize(pathname);
  if ((publicRoutes as readonly string[]).some((r) => matches(r, path))) return true;
  if (!role) return false;
  const allowed = roleRoutes[role] || [];
  return allowed.some((pat) => matches(pat, path));
}

/** Decide si mostrar un item de navegación según rol/href (para Sidebar) */
export function canSeeNavItem(role: string | null | undefined, href: string) {
  return canAccessPath(role, href);
}

/* ========= Guard ========= */
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

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);

  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (!hasHydrated) return;

    // Rutas públicas sin token
    if (!token) {
      const isPublic = (publicRoutes as readonly string[]).some((r) => matches(r, pathname));
      if (!isPublic) {
        alert("No has iniciado sesión. Por favor inicia sesión para continuar.");
        router.replace("/login");
      }
      return;
    }

    // Con token: validar expiración
    const decoded = parseJwt(token);
    if (!decoded || decoded.exp * 1000 < Date.now()) {
      clearAuth();
      alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
      router.replace("/login");
      return;
    }

    // Verificar permisos por rol
    const userRole = decoded.role?.toString().toLowerCase();
    const permitted = canAccessPath(userRole, pathname);

    if (!permitted) {
      alert("No tienes permisos para acceder a esta página.");
      const prev = prevPathRef.current;
      if (prev && prev !== pathname) {
        try {
          router.push(prev);
        } catch {
          router.replace("/login");
        }
      } else {
        router.replace("/login");
      }
    }
  }, [pathname, token, hasHydrated, clearAuth, router]);

  useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  return <>{children}</>;
}
