'use client';

import { useEffect, useState } from 'react';
import { confirmarResolucionTicket, getTickets, rechazarResolucionTicket } from '@/lib/api';
import TicketStatusChanger from '@/components/TicketStatusChanger';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import { useParams } from 'next/navigation';





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

    fetch('http://localhost:3001/users', {
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
    setUserRole(decoded.role); // Asegúrate que el JWT tiene 'role'

    getTickets(token)
      .then(setTickets)
      .catch((e) => {
        console.error('Error al obtener tickets:', e);
        alert('Error al obtener tickets');
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mis Tickets</h1>
      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium text-gray-700">Filtrar por usuario:</label>
        <select
          value={usuarioSeleccionado ?? ''}
          onChange={(e) => setUsuarioSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Todos</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nombre || usuario.email}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {tickets
          .filter((ticket: any) => ticket.status !== 'completado')
          
          .map((ticket: any) => (
            <div key={ticket.id} className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold">{ticket.title}</h2>
              <p className="text-gray-600">{ticket.description}</p>
              <p className="text-sm text-blue-600">Estado: {ticket.status}</p>
              <p className="text-sm text-red-600">Prioridad: {ticket.prioridad}</p>
              {ticket.creator && (
                <p className="text-sm text-gray-500">
                  Creado por: {ticket.creator.username || ticket.creator.email}
                </p>
              )}
              <TicketStatusChanger
                ticketId={ticket.id}
                currentStatus={ticket.status}
                currentPrioridad={ticket.prioridad}
                confirmadoPorUsuario={ticket.confirmadoPorUsuario}
                rechazadoPorUsuario={ticket.rechazadoPorUsuario
                }
                onStatusChanged={(newStatus) => {
                  setTickets(prev =>
                    prev.map(t =>
                      t.id === ticket.id ? { ...t, status: newStatus } : t
                    )
                  );
                }}
                onPrioridadChanged={(newPrioridad) => {
                  setTickets(prev =>
                    prev.map(t =>
                      t.id === ticket.id ? { ...t, prioridad: newPrioridad } : t
                    )
                  );
                }}
              />

              {userRole === 'user' &&
                ticket.status === 'resuelto' &&
                !ticket.confirmadoPorUsuario && ( // esta línea es clave
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => confirmarResolucion(ticket.id)}
                      className="bg-green-500 text-white px-4 py-1 rounded"
                    >
                      Confirmar resolución
                    </button>
                    <button
                      onClick={() => rechazarResolucion(ticket.id)}
                      className="bg-red-500 text-white px-4 py-1 rounded"
                    >
                      Rechazar resolución
                    </button>
                  </div>
                )}



            </div>
          ))}
      </div>


      <Link
        href="/tickets/new"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded mb-4 mt-6"
      >
        Crear Nuevo Ticket
      </Link>

      <a href="/tickets/completados" className="block px-4 py-2 hover:bg-gray-100">
        Ver Tickets Completados
      </a>

    </div>
  );
}
