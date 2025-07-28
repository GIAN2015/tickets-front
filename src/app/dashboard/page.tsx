'use client';

import { useEffect, useState } from 'react';
import { getTickets } from '@/lib/api';
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
                onStatusChanged={(updatedStatus) => {
                  setTickets((prevTickets) =>
                    prevTickets.map((t) =>
                      t.id === ticket.id ? { ...t, status: updatedStatus } : t
                    )
                  );
                }}
                onPrioridadChanged={(updatedPrioridad) => {
                  setTickets((prevTickets) =>
                    prevTickets.map((t) =>
                      t.id === ticket.id ? { ...t, prioridad: updatedPrioridad } : t
                    )
                  );
                }}
              />
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
