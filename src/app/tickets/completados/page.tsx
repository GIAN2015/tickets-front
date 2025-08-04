'use client';
import { ReactNode, useEffect, useState } from 'react';

interface Ticket {
  [x: string]: ReactNode;
  description: ReactNode;
  id: number;
  title: string;
  status: string;
  prioridad: string;
  creator: { username?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export default function TicketsCompletadosPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:3001/api/tickets', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })


      .then(res => res.json())
      .then(data => {
        const ticketsArray = Array.isArray(data) ? data : data.tickets;

        if (!Array.isArray(ticketsArray)) {
          console.error('La respuesta no contiene tickets válidos:', data);
          return;
        }

        const completados = ticketsArray.filter((ticket: Ticket) => ticket.status === 'completado');
        setTickets(completados);
        setLoading(false);
      })



      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Cargando tickets completados...</p>;
  if (tickets.length === 0) return <p>No hay tickets completados aún.</p>;

  return (
    
    <ul>
      
      {tickets.map((ticket) => (
        <li key={ticket.id} className="border p-4 rounded shadow">
          <h2 className="text-lg font-semibold">{ticket.title}</h2>
          <p className="text-sm text-gray-600">{ticket.description}</p>
          <p className="text-sm text-green-600">Estado: {ticket.status}</p>
          <p className="text-sm">Prioridad: {ticket.prioridad}</p>
          <p className="text-sm text-gray-500">
            Creado por: {ticket.creator?.username || ticket.creator?.email}
          </p>
          <p className="text-sm text-blue-500">
            Fecha de inicio: {new Date(ticket.createdAt).toLocaleString()}
          </p>
          {ticket.status === 'completado' && (
            <p className="text-sm text-purple-600">
              Fecha de completado: {new Date(ticket.updatedAt).toLocaleString()}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
