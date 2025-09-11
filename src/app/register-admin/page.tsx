"use client";
import router from "next/router";
import { useState } from "react";
import { useRouter } from "next/navigation";
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



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const router = useRouter(); //
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
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
    <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4 text-center">Registro Inicial Empresa</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="razonSocial" placeholder="Razón Social" onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="telefono" placeholder="Teléfono" onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="correoContacto" placeholder="Correo de contacto" onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="ruc" placeholder="RUC" onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="adminNombre" placeholder="Nombre del Admin" onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="adminEmail" placeholder="Correo del Admin" type="email" onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="adminPassword" placeholder="Contraseña" type="password" onChange={handleChange} className="w-full border p-2 rounded" />
        <input
          name="smtpPassword"
          placeholder="Contraseña de aplicación Gmail"
          type="password"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded" >
          Registrar Empresa + Admin
        </button>
      </form>
    </div>
  );
}
