'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { confirmarResolucionTicket, getTicketById, getTickets, rechazarResolucionTicket } from '@/lib/api';
import TicketStatusChanger from '@/components/TicketStatusChanger';
import { getTicketHistory } from '@/lib/api';


import { jwtDecode } from 'jwt-decode';

export default function TicketDetailPage() {
  const params = useParams();
  const { id } = params;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [historial, setHistorial] = useState<any[]>([]);
  useEffect(() => {

    if (!id) return;

    getTicketById(id)
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al obtener ticket:', err);
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
    <div className="max-w-4xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">🎫 {ticket.title}</h1>
      <p className="mb-2"><strong>Código del ticket:</strong> {ticket.id}</p>
      <p className="mb-2"><strong>Descripción:</strong> {ticket.description}</p>
      <p className="mb-2"><strong>Estado:</strong> {ticket.status}</p>
      <p className="mb-2"><strong>Prioridad:</strong> {ticket.prioridad}</p>
      <p className="mb-2"><strong>Tipo:</strong> {ticket.tipo}</p>
      <p className="mb-2"><strong>Categoría:</strong> {ticket.categoria}</p>
      <p className="mb-2"><strong>Solicitante:</strong> {ticket.usuarioSolicitante?.username || 'Ninguno'}</p>
      <p className="mb-2"><strong>Creador:</strong> {ticket.creator?.username || ticket.creator?.email}</p>

      {/* Input para mensaje */}
      {ticket.status !== "completado" && (
        <label className="block mt-4 mb-2">
          <span className="text-sm">Mensaje:</span>
          <input
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="bg-gray-800 text-white p-2 rounded w-full mt-1"
            type="text"
            placeholder="Escribe un mensaje para el ticket"
          />
        </label>
      )}


      <TicketStatusChanger
        ticketId={ticket.id}
        currentStatus={ticket.status}
        currentPrioridad={ticket.prioridad}
        confirmadoPorUsuario={ticket.confirmadoPorUsuario}
        rechazadoPorUsuario={ticket.rechazadoPorUsuario}
        onStatusChanged={(newStatus) => {
          setTicket((prev) => ({ ...prev, status: newStatus }));
        }}
        onPrioridadChanged={(newPrioridad) => {
          setTicket((prev) => ({ ...prev, prioridad: newPrioridad }));
        }}
        message={mensaje} // <-- asegúrate de que el componente lo reciba

      />

      {/* Archivo adjunto */}
      {ticket.archivoNombre && (
        <a
          href={`http://localhost:3001/tickets/${ticket.archivoNombre}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline mt-4 block"
        >
          Ver archivo adjunto
        </a>
      )}

      {/* Botones de usuario */}
      {userRole === 'user' &&
        ticket.status === 'resuelto' &&
        !ticket.confirmadoPorUsuario && (
          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={() => confirmarResolucion(ticket.id)}
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
            >
              ✅ Confirmar resolución
            </button>
            {!ticket.rechazadoPorUsuario && (
              <button
                onClick={() => rechazarResolucion(ticket.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
              >
                ❌ Rechazar
              </button>
            )}

          </div>
        )}

      <div className="mt-6 bg-gray-900 text-white p-4 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-3">📜 Historial de cambios</h2>
        {historial.length === 0 ? (
          <p>No hay historial aún.</p>
        ) : (
          <ul className="space-y-3">
            {historial.map((h) => (
              <li key={h.id} className="border-b border-gray-700 pb-2">
                <div>🕒 <strong>{new Date(h.fecha).toLocaleString()}</strong></div>
                <div>👤 Actualizado por: <strong>{h.actualizadoPor?.username || 'Usuario desconocido'}</strong></div>

                {/* Estado siempre visible */}
                <div>
                  🔁 Estado:{" "}
                  {h.statusAnterior && h.statusNuevo && h.statusAnterior !== h.statusNuevo
                    ? <><strong>{h.statusAnterior}</strong> → <strong>{h.statusNuevo}</strong></>
                    : <strong>{h.statusNuevo || h.statusAnterior || ticket.status}</strong>
                  }
                </div>

                {/* Prioridad siempre visible */}
                <div>
                  ⚙️ Prioridad:{" "}
                  {h.prioridadAnterior && h.prioridadNueva && h.prioridadAnterior !== h.prioridadNueva
                    ? <><strong>{h.prioridadAnterior}</strong> → <strong>{h.prioridadNueva}</strong></>
                    : <strong>{h.prioridadNueva || h.prioridadAnterior || ticket.prioridad}</strong>
                  }
                </div>

                {h.mensaje && (
                  <p>💬 Mensaje: <span className="italic text-gray-300">{h.mensaje}</span></p>
                )}

                {h.adjuntoNombre && (
                  <a
                    href={`http://localhost:3001/tickets/${h.adjuntoNombre}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline mt-2 inline-block"
                  >
                    📎 Ver archivo adjunto
                  </a>
                )}
              </li>
            ))}



          </ul>
        )}
      </div>

    </div>
  );
}

