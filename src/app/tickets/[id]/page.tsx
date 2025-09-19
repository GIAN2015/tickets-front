'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { confirmarResolucionTicket, getTicketById, getTickets, rechazarResolucionTicket } from '@/lib/api';
import TicketStatusChanger from '@/components/TicketStatusChanger';
import { getTicketHistory } from '@/lib/api';


import { jwtDecode } from 'jwt-decode';
// src/types/ticket.ts
type Ticket = {
  id: number;
  title: string;
  description: string;
  status: string;
  prioridad: string;
  tipo: string;
  categoria: string;
  confirmadoPorUsuario?: boolean;
  rechazadoPorUsuario?: boolean;
  usuarioSolicitante?: {
    id: number;
    username: string;
    email: string;
  } | null;
  creator?: {
    id: number;
    username?: string;
    email: string;
  } | null;
  archivoNombre?: string[];
};

export default function TicketDetailPage() {
  const params = useParams();
  const { id } = params;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [historial, setHistorial] = useState<any[]>([]);


  useEffect(() => {
    if (!id) return;

    // Aseguramos que id sea string
    const ticketId = Array.isArray(id) ? id[0] : id;

    getTicketById(ticketId)
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al obtener ticket:", err);
        setLoading(false);
      });
  }, [id]);


  useEffect(() => {
    if (!ticket?.id) return;

    const fetchHistorial = async () => {
      try {
        const data = await getTicketHistory(ticket.id);
        setHistorial(data);
      } catch (error) {
        console.error('Error al obtener historial del ticket:', error);
      }
    };

    fetchHistorial();
  }, [ticket]);






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

  async function refreshTicket() {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:3001/api/tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTicket(data);
  }

  useEffect(() => {
    refreshTicket();
  }, [id]);

  const confirmarResolucion = async (ticketId: number) => {
    try {
      const data = await confirmarResolucionTicket(ticketId);

      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t.id === ticketId ? { ...t, confirmadoPorUsuario: true } : t
        )
      );
      window.location.reload(); // Recargar la página para reflejar el cambio
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
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('No se pudo rechazar la resolución');
    }
  };
  if (loading) return <p className="text-white p-8">Cargando...</p>;
  if (!ticket) return <p className="text-red-500 p-8">Ticket no encontrado</p>;

  return (
    <div className="max-w-5xl mx-auto p-8 text-white space-y-6">
      {/* Sección principal del ticket */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-700">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-green-400">🎫 {ticket.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-200">
          <p><strong>Código:</strong> {ticket.id}</p>
          <p><strong>Estado:</strong> {ticket.status}</p>
          <p><strong>Prioridad:</strong> {ticket.prioridad}</p>
          <p><strong>Tipo:</strong> {ticket.tipo}</p>
          <p><strong>Categoría:</strong> {ticket.categoria}</p>
          <p><strong>Solicitante:</strong> {ticket.usuarioSolicitante?.username || 'Ninguno'}</p>
          <p><strong>Creador:</strong> {ticket.creator?.username || ticket.creator?.email}</p>
        </div>
        <p className="mt-4 text-gray-300"><strong>Descripción:</strong> {ticket.description}</p>

        {/* Input de mensaje */}
        {ticket.status !== "completado" && (
          <label className="block mt-6">
            <span className="text-sm text-gray-300">Mensaje:</span>
            <input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="bg-gray-800 text-white p-3 rounded-lg w-full mt-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              type="text"
              placeholder="Escribe un mensaje para el ticket"
            />
          </label>
        )}

        <TicketStatusChanger
          ticket={ticket}
          ticketId={ticket.id}
          currentStatus={ticket.status}
          currentPrioridad={ticket.prioridad}
          confirmadoPorUsuario={ticket.confirmadoPorUsuario}
          rechazadoPorUsuario={ticket.rechazadoPorUsuario}
          onStatusChanged={(newStatus) =>
            setTicket((prev: any) => ({ ...prev, status: newStatus }))
          }
          onPrioridadChanged={(newPrioridad) =>
            setTicket((prev: any) => ({ ...prev, prioridad: newPrioridad }))
          }

          message={mensaje}
          refreshHistorial={refreshTicket}
        />

        {/* Archivo adjunto */}
        {ticket.archivoNombre?.length > 0 && (
          <div className="mt-4">
            {ticket.archivoNombre.map((archivo: string, idx: number) => (
              <a
                key={idx}
                href={`http://localhost:3001/tickets/${archivo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-400 underline hover:text-blue-300 transition"
              >
                📎 {archivo}
              </a>
            ))}
          </div>
        )}


        {/* Botones de usuario */}
        {userRole === 'user' && ticket.status === 'resuelto' && !ticket.confirmadoPorUsuario && (
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={() => confirmarResolucion(ticket.id)}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow-md transition transform hover:scale-105"
            >
              ✅ Confirmar resolución
            </button>
            {!ticket.rechazadoPorUsuario && (
              <button
                onClick={() => rechazarResolucion(ticket.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-md transition transform hover:scale-105"
              >
                ❌ Rechazar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Historial de cambios */}
      {/* Historial de cambios con diseño tipo “paso a paso” */}
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-green-300"> Historial de cambios</h2>

        {historial.length === 0 ? (
          <p className="text-gray-400">No hay historial aún.</p>
        ) : (
          <div className="relative border-l border-gray-600 pl-6 space-y-8">
            {historial.map((h, index) => (
              <div key={h.id} className="relative group">
                {/* Punto del timeline */}
                <span className="absolute -left-3 top-2 w-6 h-6 flex items-center justify-center rounded-full 
            bg-green-500 text-white font-bold shadow-lg group-hover:scale-110 transform transition">
                  {index + 1}
                </span>

                {/* Caja de detalle */}
                <div className="bg-gray-900 p-5 rounded-xl shadow-md border border-gray-700 transition group-hover:border-green-400 group-hover:shadow-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">🕒 {new Date(h.fecha).toLocaleString()}</span>
                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                      {h.statusNuevo || h.statusAnterior || ticket.status}
                    </span>
                  </div>
                  <p className="text-gray-200 mb-1">
                    👤 <strong>{h.actualizadoPor?.username || "Usuario desconocido"}</strong>
                  </p>
                  <p className="text-gray-300">
                    🔁 Estado:{" "}
                    {h.statusAnterior && h.statusNuevo && h.statusAnterior !== h.statusNuevo ? (
                      <>
                        <strong className="text-red-400">{h.statusAnterior}</strong> →{" "}
                        <strong className="text-green-400">{h.statusNuevo}</strong>
                      </>
                    ) : (
                      <strong>{h.statusNuevo || h.statusAnterior || ticket.status}</strong>
                    )}
                  </p>
                  <p className="text-gray-300">
                    ⚙️ Prioridad:{" "}
                    {h.prioridadAnterior && h.prioridadNueva && h.prioridadAnterior !== h.prioridadNueva ? (
                      <>
                        <strong className="text-red-400">{h.prioridadAnterior}</strong> →{" "}
                        <strong className="text-green-400">{h.prioridadNueva}</strong>
                      </>
                    ) : (
                      <strong>{h.prioridadNueva || h.prioridadAnterior || ticket.prioridad}</strong>
                    )}
                  </p>
                  {h.mensaje && (
                    <p className="italic text-gray-400 mt-2">💬 "{h.mensaje}"</p>
                  )}
                  {h.adjuntoNombre && h.adjuntoNombre.length > 0 && (
                    <div>
                      <b>Archivos adjuntos:</b>
                      <ul>
                        {h.adjuntoNombre.map((file: string, idx: number) => (
                          <li key={idx}>
                            <a
                              href={`http://localhost:3001/tickets/${file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {file}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

