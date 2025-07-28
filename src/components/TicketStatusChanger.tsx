'use client';

import { useEffect, useState } from 'react';



interface Usuario {
  id: number;
  nombre: string;
  email: string;
  role: string;
}

export default function TicketStatusChanger({
  ticketId,
  currentStatus,
  currentPrioridad,
  onStatusChanged,
  onPrioridadChanged,
}: {
  ticketId: number;
  currentStatus: string;
  currentPrioridad: string;
  onStatusChanged: (newStatus: string) => void;
  onPrioridadChanged: (newPrioridad: string) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [prioridad, setPrioridad] = useState(currentPrioridad);
  const [role, setRole] = useState<string>('user');

  // Opciones de estado
  const allOptions = ['no iniciado' , 'asignado' , 'en proceso' , 'resuelto' , 'completado'];
  const visibleOptions = role === 'ti'
    ? allOptions
    : allOptions.filter(option => option !== 'completado');

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole === 'ti' || storedRole === 'user') {
      setRole(storedRole);
    }
  }, []);

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:3001/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, prioridad }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Error al actualizar: ${msg}`);
      }

      const updated = await res.json();
      onStatusChanged(updated.status);
      onPrioridadChanged(updated.prioridad);
      alert('Ticket actualizado con éxito');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el ticket');
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div>
        <label className="text-sm">Estado:</label>
        <select
          className="ml-2 border px-2 py-1"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {visibleOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm">Prioridad:</label>
        <select
          className="ml-2 border px-2 py-1"
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value)}
        >
          <option value="muy_bajo">Muy Baja</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="muy_alta">Muy Alta</option>
        </select>
      </div>
      <button
        onClick={handleUpdate}
        className="bg-green-600 text-white px-3 py-1 rounded mt-2"
      >
        Guardar Cambios
      </button>
    </div>
  );
}
