// app/(auth)/login/page.tsx   <-- ajusta la ruta según tu proyecto
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getEmpresaById, login } from "@/lib/api";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/components/useAuthStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { access_token } = await login(username, password);
      const decoded: any = jwtDecode(access_token);
      console.log("Decoded JWT:", decoded);

      const IDEmpresa = decoded.empresaId ?? null;
      const role = decoded.role ?? null;
      const userName = decoded.username ?? decoded.sub ?? null;
      const emailFromToken = decoded.email ?? null;

      
      let NombreEmpresa: string | null = null;
      if (IDEmpresa) {
        try {
          const empresa = await getEmpresaById(IDEmpresa);
          NombreEmpresa = empresa?.razonSocial ?? null;
        } catch (err) {
          console.warn("No se pudo obtener empresa:", err);
        }
      }

      const user = {
        username: userName,
        role,
        empresaId: IDEmpresa,
        empresaNombre: NombreEmpresa,
        email: emailFromToken,
      };

      setAuth(access_token, user);

      if (role === "admin") router.push("/usuarios");
      else router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("❌ Credenciales inválidas. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-6 py-12">
      {/* Decorative subtle shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <svg className="hidden lg:block absolute -left-16 top-8 w-[520px] h-[520px] opacity-7" viewBox="0 0 520 520" fill="none">
          <circle cx="130" cy="120" r="180" fill="url(#g1)"></circle>
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#0ea5a4" stopOpacity="0.06" />
              <stop offset="1" stopColor="#60a5fa" stopOpacity="0.04" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* LEFT: branding */}
        <aside className="hidden lg:flex flex-col justify-center gap-6 px-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center rounded-md bg-slate-900 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7a1 1 0 011-1h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 10h8M8 14h5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 leading-tight">Sistema de Tickets</h2>
              <p className="text-sm text-slate-500">Seguimiento rápido y claro de incidencias</p>
            </div>
          </div>

          <h3 className="mt-6 text-2xl font-bold text-slate-800 leading-tight">Resuelve con claridad</h3>

          <p className="text-sm text-slate-500 max-w-xs">
            Historial por usuario, asignación por roles y notificaciones. Interfaz ligera y eficiente para equipos de soporte.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block w-2 h-2 bg-sky-500 rounded-full"></span>
              Seguimiento por prioridad y estado
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
              Notificaciones e historial automático
            </li>
          </ul>
        </aside>

        {/* RIGHT: form */}
        <section className="flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-slate-800">Bienvenido</h1>
              <p className="mt-1 text-sm text-slate-500">Inicia sesión para acceder al panel de tickets</p>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="mb-4 px-4 py-3 rounded-md bg-red-50 text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" aria-label="formulario de inicio de sesión">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                  Usuario
                </label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  type="text"
                  placeholder="correo@ejemplo.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
                  aria-invalid={!!error}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-slate-700 hover:from-sky-700 hover:to-slate-800 text-white font-semibold rounded-md px-4 py-3 shadow-sm transform-gpu hover:-translate-y-[1px] transition disabled:opacity-60"
                aria-live="polite"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Ingresar"}
              </button>
            </form>

            <div className="hidden sm:block my-6 border-t border-slate-100" />

            <div className="mt-6 text-sm text-slate-400 flex items-center justify-between">
              <span>Versión</span>
              <strong className="text-slate-600">v1.0</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
