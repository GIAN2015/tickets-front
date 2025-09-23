"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUsuario } from "@/lib/api";
import { UserPlus, AtSign, KeyRound, ChevronDown, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";

type FormState = {
  username: string;
  email: string;
  password: string;
  role: "user" | "ti";
};

export default function RegistroUsuarioPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMsg(null);
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setMsg({ type: "err", text: "Completa todos los campos obligatorios." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setMsg({ type: "err", text: "Ingresa un correo válido." });
      return;
    }

    setLoading(true);
    try {
      const data = await createUsuario(form);
      console.log("Usuario creado:", data);
      setMsg({ type: "ok", text: `Usuario creado: ${form.email}` });
      setForm({ username: "", email: "", password: "", role: "user" });
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setMsg({ type: "err", text: String(err.response.data.message) });
        console.error("Error del backend:", err.response.data);
      } else {
        setMsg({ type: "err", text: "Error al crear usuario." });
        console.error("Error desconocido:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
        {/* Header con volver */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-sky-600 text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Registrar usuario</h2>
              <p className="text-xs text-slate-500">Añade un usuario al sistema de tickets</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/usuarios")}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg px-3 py-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>

        {/* Mensaje */}
        {msg && (
          <div
            role="alert"
            className={`mb-4 rounded-md px-4 py-3 text-sm border ${
              msg.type === "ok"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-red-50 text-red-700 border-red-100"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <div className="relative">
              <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="username"
                placeholder="usuario@empresa.com"
                value={form.username}
                onChange={handleChange}
                required
                className="h-10 w-full pl-10 pr-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
            <div className="relative">
              <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email"
                name="email"
                placeholder="correo@empresa.com"
                value={form.email}
                onChange={handleChange}
                required
                className="h-10 w-full pl-10 pr-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPwd ? "text" : "password"}
                name="password"
                placeholder="Contraseña segura"
                value={form.password}
                onChange={handleChange}
                required
                className="h-10 w-full pl-10 pr-10 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0 text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <div className="relative">
              <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="appearance-none h-10 w-full pl-10 pr-9 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="user">Usuario</option>
                <option value="ti">TI</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60"
            aria-live="polite"
          >
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      </div>
    </div>
  );
}
