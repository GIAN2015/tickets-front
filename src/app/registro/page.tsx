"use client";
import { useState } from "react";
import { createUsuario } from "@/lib/api"; // importa tu función

export default function CrearUsuario() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await createUsuario(form);
      console.log("Usuario creado:", data);
      alert("Usuario creado:  " + form.email)
    } catch (err: any) {
      if (err.response) {
        console.error("Error del backend:", err.response.data); // 👈 aquí
        alert("Error: " + JSON.stringify(err.response.data.message));
      } else {
        console.error("Error desconocido:", err);
        alert("Error al crear usuario");
      }
    }
  };


  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md space-y-4"
    >
      <h2 className="text-xl font-bold text-center">Crear Usuario</h2>

      <input
        type="text"
        name="username"
        placeholder="Nombre de usuario"
        value={form.username}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <input
        type="email"
        name="email"
        placeholder="Correo"
        value={form.email}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="user">Usuario</option>
        <option value="ti">TI</option>
        <option value="admin">Administrador</option>
      </select>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Crear Usuario
      </button>
    </form>
  );
}
