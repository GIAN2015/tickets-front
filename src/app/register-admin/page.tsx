"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Phone, KeyRound, User, FileText } from "lucide-react";

export default function RegisterAdminPage() {
  const [form, setForm] = useState({
    razonSocial: "",
    telefono: "",
    correoContacto: "",
    ruc: "",
    adminNombre: "",
    adminEmail: "",
    adminPassword: "",
    smtpPassword: "",
  });

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("https://tickets-backend-fw5d.onrender.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ Error en registro:", data);
        alert("Error: " + JSON.stringify(data.message));
        return;
      }

      console.log("✅ Respuesta backend:", data);
      alert("Empresa + Admin creados correctamente ✅");
      router.push("/login");
    } catch (error) {
      console.error("Error en request:", error);
      alert("Error al registrar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-md bg-sky-600 text-white mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            Registro Inicial de Empresa
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crea la empresa y su primer administrador
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Razón Social
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                name="razonSocial"
                onChange={handleChange}
                placeholder="Mi Empresa SAC"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                name="telefono"
                onChange={handleChange}
                placeholder="999 888 777"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo de contacto
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                name="correoContacto"
                onChange={handleChange}
                placeholder="contacto@empresa.com"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              RUC
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                name="ruc"
                onChange={handleChange}
                placeholder="12345678901"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          {/* Admin info */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-800 mb-2">Administrador</h3>

            <div className="relative mb-3">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                name="adminNombre"
                onChange={handleChange}
                placeholder="Nombre completo"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div className="relative mb-3">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                name="adminEmail"
                onChange={handleChange}
                placeholder="admin@empresa.com"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div className="relative mb-3">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                name="adminPassword"
                onChange={handleChange}
                placeholder="Contraseña segura"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                name="smtpPassword"
                onChange={handleChange}
                placeholder="Contraseña app Gmail"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 text-white py-2.5 rounded-lg font-medium hover:bg-sky-700 transition-colors"
          >
            Registrar Empresa + Admin
          </button>
        </form>
      </div>
    </div>
  );
}
