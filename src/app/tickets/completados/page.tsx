'use client';
import { ReactNode, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface Ticket {
  [x: string]: ReactNode;
  description: ReactNode;
  id: number;
  title: string;
  status: string;
  prioridad: string;
  tipo: string;
  categoria: string;
  creator: { username?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export default function TicketsCompletadosPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [searchId, setSearchId] = useState('');

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
        setFilteredTickets(completados);

        const uniqueUsers = Array.from(
          new Set(completados.map(t => t.creator?.username || t.creator?.email))
        );
        setUsers(uniqueUsers);

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const aplicarFiltro = () => {
    let filtered = tickets;

    if (selectedUser) {
      filtered = filtered.filter(ticket =>
        (ticket.creator?.username || ticket.creator?.email) === selectedUser
      );
    }

    if (searchId) {
      filtered = filtered.filter(ticket =>
        ticket.id.toString().includes(searchId)
      );
    }

    setFilteredTickets(filtered);
  };

  const exportarExcel = () => {
    const datos = filteredTickets.map(ticket => ({
      ID: ticket.id,
      Título: ticket.title,
      Descripción: ticket.description,
      Estado: ticket.status,
      Prioridad: ticket.prioridad,
      Tipo: ticket.tipo,
      Categoría: ticket.categoria,
      Creador: ticket.creator?.username || ticket.creator?.email,
      Fecha_Creación: new Date(ticket.createdAt).toLocaleString(),
      Fecha_Completado: new Date(ticket.updatedAt).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets Completados");
    XLSX.writeFile(wb, "tickets_completados.xlsx");
  };

  if (loading) return <p>Cargando tickets completados...</p>;

  if (filteredTickets.length === 0)
    return (
      <div>
        <p>No hay tickets completados que coincidan con la búsqueda.</p>
        <a href="/dashboard">
          <button className="mb-6 inline-flex items-center text-green-700 hover:text-green-900 font-medium transition">
            ← Volver a mis tickets
          </button>
        </a>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border">
      <a href="/dashboard">
        <button
          type="button"
          className="mb-6 inline-flex items-center text-green-700 hover:text-green-900 font-medium transition"
        >
          ← Volver al Dashboard
        </button>
      </a>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-black">📋 Lista de Tickets Completados</h1>
        <button
          onClick={exportarExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📤 Exportar Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">Filtrar por usuario</option>
          {users.map((user, index) => (
            <option key={index} value={user}>
              {user}
            </option>
          ))}
        </select>

        <div className="flex items-center border rounded">
          <input
            type="text"
            placeholder="Buscar por ID de ticket"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="px-3 py-2 outline-none"
          />
          <button
            onClick={aplicarFiltro}
            className="px-3 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
          >
            🔍
          </button>
        </div>
      </div>

      <ul className="space-y-4">
        {filteredTickets.map((ticket) => (
          <li key={ticket.id} className="border border-gray-200 p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-black">{ticket.title}</h2>
            <p className="text-sm text-black mt-1">{ticket.description}</p>

            <div className="mt-2 text-sm space-y-1">
              <p className="text-green-600">
                Estado: <span className="font-medium">{ticket.status}</span>
              </p>
              <p className="text-black">
                Prioridad: <span className="font-medium">{ticket.prioridad}</span>
              </p>
              <p className="text-black">
                Tipo: <span className="font-medium">{ticket.tipo}</span>
              </p>
              <p className="text-black">
                Categoría: <span className="font-medium">{ticket.categoria}</span>
              </p>
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

              <a
                href={`/tickets/${ticket.id}`}
                className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Ver historial
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
