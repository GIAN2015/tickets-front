'use client';
import router from 'next/router';
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
  if (tickets.length === 0) return (
<div>   <p>No hay tickets completados.</p>
<a href='/dashboard' >
    <button
   
      className="mb-6 inline-flex items-center text-green-700 hover:text-green-900 font-medium transition"
    >
      ← Volver a mis tickets
    </button></a> </div>)
  
    ;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border">
      {/* Botón de volver */}
      <a href='/dashboard'>
      <button
        type="button"
       
        className="mb-6 inline-flex items-center text-green-700 hover:text-green-900 font-medium transition"
      >
        ← Volver al Dashboard
      </button></a>

      <h1 className="text-2xl font-bold text-black mb-4">📋 Lista de Tickets</h1>

      <ul className="space-y-4">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="border border-gray-200 p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-black">{ticket.title}</h2>
            <p className="text-sm text-black mt-1">{ticket.description}</p>

            <div className="mt-2 text-sm space-y-1">
              <p className="text-green-600">Estado: <span className="font-medium">{ticket.status}</span></p>
              <p className="text-black">Prioridad: <span className="font-medium">{ticket.prioridad}</span></p>
              <p className="text-black">
                Creado por: <span className="font-medium">{ticket.creator?.username || ticket.creator?.email}</span>
              </p>
              <p className="text-blue-600">
                Fecha de inicio: <span className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</span>
              </p>
              {ticket.status === 'completado' && (
                <p className="text-purple-600">
                  Fecha de completado: <span className="font-medium">{new Date(ticket.updatedAt).toLocaleString()}</span>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
