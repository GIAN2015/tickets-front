'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { jwtDecode } from 'jwt-decode'; // ✅ Import corregido

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { access_token } = await login(username, password);

      // ✅ Aquí se decodifica correctamente el token
      const decoded: any = jwtDecode(access_token);
      const role = decoded.role;

      // ✅ Guardamos token y rol
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);

      router.push('/dashboard');
    } catch (error) {
      alert('Credenciales inválidas');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-96 space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>
        <input
          className="w-full border px-3 py-2 rounded"
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full border px-3 py-2 rounded"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
          Ingresar
        </button>
      </form>
    </div>
  );
}
