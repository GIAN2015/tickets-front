'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { access_token } = await login(username, password);

      // ✅ Decodificar token y extraer rol
      const decoded: any = jwtDecode(access_token);
      const role = decoded.role;

      // ✅ Guardar en localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);

      router.push('/dashboard');
    } catch (err) {
      setError('❌ Credenciales inválidas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6 border border-gray-200"
      >
        <h1 className="text-3xl font-bold text-center text-gray-800">🔐 Iniciar Sesión</h1>
        
        {error && (
          <div className="text-red-600 bg-red-100 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-medium mb-1">Usuario</label>
          <input
            className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            type="text"
            placeholder="Ingresa tu usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Contraseña</label>
          <input
            className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
