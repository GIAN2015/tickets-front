'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket, getUsuarios } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

interface DecodedUser {
  id: number;
  rol: 'USER' | 'TI' | 'ADMIN'; // ajusta si hay más roles
  nombre: string;
  email: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
}
export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSolicitanteId, setUsuarioSolicitanteId] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [role, setRole] = useState('');
  const [user, setUser] = useState(null);



  const estadosPorRol = {
    USER: ['Pendiente', 'En Proceso', 'Resuelto'],
    TI: ['Pendiente', 'En Proceso', 'Resuelto', 'Completado'],
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decoded: any = jwtDecode(token);
    setUser(decoded);

    if (decoded.rol === 'TI') {
      fetchUsuarios();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded: any = jwtDecode(token);
      setUser({
        id: decoded.sub,
        role: decoded.rol,
        nombre: decoded.nombre,
        email: decoded.email,
      });
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'TI') {
      fetch('http://localhost:3000/api/users')
        .then((res) => res.json())
        .then((data) => {
          console.log("Usuarios cargados:", data);
          setUsuarios(data);
        })
        .catch((err) => console.error('Error al obtener usuarios', err));
    }
  }, [user]);




  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No has iniciado sesión');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      const creadoPorId =
        decoded.rol === 'TI' ? usuarioSolicitanteId : decoded.id;

      if (decoded.rol === 'TI' && !usuarioSolicitanteId) {
        alert('Debes seleccionar un usuario solicitante');
        return;
      }

      const ticketData: any = {
        title,
        description,
        prioridad,
        creadoPorId,
      };

      // Solo incluye usuarioId si el rol es TI
      if (decoded.rol === 'TI') {
        if (!usuarioSolicitanteId) {
          alert('Debes seleccionar un usuario solicitante');
          return;
        }
        ticketData.usuarioId = usuarioSolicitanteId;
      }

      await createTicket(ticketData, token);
      alert('Ticket creado con éxito');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error al crear ticket');
    }
  }



  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Crear Ticket</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded"
        />

        <textarea
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded h-24"
        />

        // Línea que muestra el dropdown para el TI
        {user?.role === 'TI' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Usuario solicitante</label>
            <select
              value={usuarioSolicitanteId}
              onChange={(e) => setUsuarioSolicitanteId(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Selecciona un usuario</option>
              {usuarios.map((u: Usuario) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}




        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Prioridad</label>
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="muy bajo">Muy Bajo</option>
            <option value="bajo">Bajo</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="muy alta">Muy Alta</option>
          </select>
        </div>




        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Crear Ticket
        </button>
      </form>
    </div>
  );
}
