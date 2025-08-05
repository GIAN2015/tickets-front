'use client';

import { useEffect, useState } from 'react';
import { confirmarResolucionTicket, getTickets, rechazarResolucionTicket } from '@/lib/api';
import TicketStatusChanger from '@/components/TicketStatusChanger';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';




interface Usuario {
  id: number;
  nombre: string;
  email: string;
  role: string;
}
export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [userRole, setUserRole] = useState('');
  const params = useParams();
  const ticketId = params?.id;
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };
  const confirmarResolucion = async (ticketId: number) => {
    try {
      const data = await confirmarResolucionTicket(ticketId);

      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t.id === ticketId ? { ...t, confirmadoPorUsuario: true } : t
        )
      );
    } catch (err) {
      console.error(err);
      alert('No se pudo confirmar la resolución');
    }
  };

  const rechazarResolucion = async (ticketId: number) => {
    try {
      const data = await rechazarResolucionTicket(ticketId); // esta función debe estar en tu `api.ts`

      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t.id === ticketId ? { ...t, rechazadoPorUsuario: true } : t
        )
      );
    } catch (err) {
      console.error(err);
      alert('No se pudo rechazar la resolución');
    }
  };


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:3001/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsuarios(data))
      .catch(err => console.error('Error al cargar usuarios:', err));
  }, []);

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole) {
      setUserRole(storedRole);
    }
  }, []);







  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Decodifica el token para obtener el rol
    const decoded: any = jwtDecode(token);
    setUserRole(decoded.role);
    setUserId(Number(decoded.sub)); // Asegúrate que el JWT tiene 'role'

    getTickets(token)
      .then(setTickets)
      .catch((e) => {
        console.error('Error al obtener tickets:', e);
        alert('Error al obtener tickets');
      });
  }, []);



  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      {/* Botón de logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition duration-200 shadow-md mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 11-4 0v-1m4-4V9a4 4 0 10-8 0v1"
          />
        </svg>
        Cerrar sesión
      </button>

      <h1 className="text-3xl font-bold mb-6">📋 Mis Tickets</h1>

      {/* Botones de navegación */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link
          href="/tickets/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition"
        >
          ➕ Crear Nuevo Ticket
        </Link>
        <a
          href="/tickets/completados"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition"
        >
          ✅ Ver Tickets Completados
        </a>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {userRole === 'ti' && (
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 ">👤 Filtrar por usuario:</label>
            <select
              value={usuarioSeleccionado ?? ''}
              onChange={(e) => setUsuarioSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-gray-500 rounded px-3 py-2 text-white"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.username || usuario.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">📌 Estado de Tickets:</label>
          <select
            value={estadoSeleccionado ?? ''}
            onChange={(e) => setEstadoSeleccionado(e.target.value || null)}
            className="border border-gray-500 rounded px-3 py-2 text-white"
          >
            <option value="">Todos los estados</option>
            <option value="asignado">Asignado</option>
            <option value="en progreso">En Progreso</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>
      </div>

      {/* Tabla de Tickets */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800 text-white border border-gray-600 rounded-lg">
          <thead>
            <tr className="bg-gray-700 text-left">
              <th className="px-4 py-2 border border-gray-600">#</th>
              <th className="px-4 py-2 border border-gray-600">Título</th>
              <th className="px-4 py-2 border border-gray-600">Descripción</th>
              <th className="px-4 py-2 border border-gray-600">Estado</th>
              <th className="px-4 py-2 border border-gray-600">Prioridad</th>
              <th className="px-4 py-2 border border-gray-600">Categoría</th>
              <th className="px-4 py-2 border border-gray-600">Creador</th>
              <th className="px-4 py-2 border border-gray-600">Solicitante</th>
              <th className="px-4 py-2 border border-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets
              .filter((ticket: any) => !estadoSeleccionado || ticket.status === estadoSeleccionado)
              .filter((ticket: any) => ticket.status !== 'completado')
              .filter((ticket: any) =>
                !usuarioSeleccionado ||
                ticket.creator?.id === usuarioSeleccionado ||
                ticket.usuarioSolicitante?.id === usuarioSeleccionado
              )
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((ticket: any, index: number) => (
                <tr key={ticket.id} className="border-t border-gray-700">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{ticket.title}</td>
                  <td className="px-4 py-2">{ticket.description}</td>
                  <td className="px-4 py-2">{ticket.status}</td>
                  <td className="px-4 py-2">{ticket.prioridad}</td>
                  <td className="px-4 py-2">{ticket.categoria}</td>
                  <td className="px-4 py-2">
                    {ticket.creator?.username || ticket.creator?.email}
                  </td>
                  <td className="px-4 py-2">
                    {ticket.usuarioSolicitante?.username || 'Ninguno'}
                  </td>
                  <td className="px-4 py-2 space-y-1">
                    <TicketStatusChanger
                      ticketId={ticket.id}
                      currentStatus={ticket.status}
                      currentPrioridad={ticket.prioridad}
                      confirmadoPorUsuario={ticket.confirmadoPorUsuario}
                      rechazadoPorUsuario={ticket.rechazadoPorUsuario}
                      onStatusChanged={(newStatus) => {
                        setTickets((prev) =>
                          prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t))
                        );
                      }}
                      onPrioridadChanged={(newPrioridad) => {
                        setTickets((prev) =>
                          prev.map((t) => (t.id === ticket.id ? { ...t, prioridad: newPrioridad } : t))
                        );
                      }}
                    />
                    {userRole === 'user' &&
                      ticket.status === 'resuelto' &&
                      !ticket.confirmadoPorUsuario && (
                        <div className="flex flex-col gap-2 mt-2">
                          <button
                            onClick={() => confirmarResolucion(ticket.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                          >
                            ✅ Confirmar
                          </button>
                          <button
                            onClick={() => rechazarResolucion(ticket.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                          >
                            ❌ Rechazar
                          </button>
                        </div>
                      )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


