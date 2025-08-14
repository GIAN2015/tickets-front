'use client';

import { resetearRechazoResolucion } from '@/lib/api';
import { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
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
  confirmadoPorUsuario,
  rechazadoPorUsuario,
  message,
  refreshHistorial,

}: {
  ticketId: number;
  message: string;
  currentStatus: string;
  currentPrioridad: string;
  onStatusChanged: (newStatus: string) => void;
  onPrioridadChanged: (newPrioridad: string) => void;
  confirmadoPorUsuario: boolean;
  rechazadoPorUsuario: boolean;
  refreshHistorial: () => Promise<void>; // <--- tipo
}) {
  const [status, setStatus] = useState(currentStatus);
  const [prioridad, setPrioridad] = useState(currentPrioridad);
  const [role, setRole] = useState<string | null>(null);
  const [showRechazoMessage, setShowRechazoMessage] = useState(rechazadoPorUsuario);
  const [rechazadoLocal, setRechazadoLocal] = useState(rechazadoPorUsuario);
  const [archivo, setArchivo] = useState<File | null>(null);
  // Correo del solicitante



  // Lista completa de estados
  const allOptions = ['no iniciado', 'asignado', 'en proceso', 'resuelto', 'completado'];

  // Opciones visibles dependiendo del rol y confirmación
  const visibleOptions = role === 'ti'
    ? allOptions.filter(option => {
      if (option === 'completado') {
        return confirmadoPorUsuario; // Solo si fue confirmado por el usuario
      }
      return true;
    })
    : [];
  useEffect(() => {
    setRechazadoLocal(rechazadoPorUsuario);
  }, [rechazadoPorUsuario]);

  useEffect(() => {
    console.log('confirmadoPorUsuario:', confirmadoPorUsuario);
  }, [confirmadoPorUsuario]);

  useEffect(() => {

    const storedRole = localStorage.getItem('role');
    if (storedRole === 'ti' || storedRole === 'user') {
      setRole(storedRole);
    }
  }, []);

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');

      // Resetear el rechazo de resolución
      await resetearRechazoResolucion(ticketId);

      let bodyToSend;
      let headersToSend: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      if (archivo) {
        // Si hay archivo → multipart/form-data
        const formData = new FormData();
        formData.append('status', status);
        formData.append('prioridad', prioridad);
        formData.append('message', message || '');
        formData.append('archivo', archivo);
        bodyToSend = formData;
        // No se define Content-Type para FormData
      } else {
        // Si NO hay archivo → JSON
        headersToSend['Content-Type'] = 'application/json';
        bodyToSend = JSON.stringify({
          status,
          prioridad,
          message,
        });
      }

      const res = await fetch(`http://localhost:3001/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: headersToSend,
        body: bodyToSend,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Error al actualizar: ${msg}`);
      }
      setRechazadoLocal(false);
      const updated = await res.json();
      // Enviar correo al usuario solicitante


      // Enviar correo al creador del ticket


      // Actualizamos estado local y ocultamos el mensaje de rechazo
      onStatusChanged(updated.status);
      onPrioridadChanged(updated.prioridad);
      setShowRechazoMessage(false);



      // const emailTo = '{{}}'; // puedes traer esto del usuario creador o solicitante

      // const templateParams = {
      //   email: emailTo,
      //   subject: 'Actualización de estado de ticket',
      //   ticket_id: ticketId,
      //   new_status: updated.status,
      //   prioridad: updated.prioridad,
      //   fecha: new Date().toLocaleString(),
      // };

      // await emailjs.send(
      //   'service_abc123',
      //   'template_qxfh3l4', // 👈 tu nuevo template aquí
      //   templateParams,
      //   'FBQ9PmnOeJKELISx3'
      // );
      window.location.reload();
      alert('Ticket actualizado con éxito y correo enviado');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el ticket');
    }
  };



  return (
    <>
      {/* Solo TI puede ver Estado y Prioridad */}
      {role === 'ti' && (
        <>
          {status === 'resuelto' && rechazadoPorUsuario && (
            <p className="text-red-600 font-semibold">
              ⚠️ El usuario rechazó la resolución del ticket.
            </p>
          )}

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
              <option value="bajo">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="muy_alta">Muy Alta</option>
            </select>
          </div>
        </>
      )}

      {/* Archivo adjunto y Guardar Cambios para TODOS */}
     {/* Archivo adjunto y Guardar Cambios solo si NO está completado */}
    {status !== 'completado' && (
      <>
        <label className="block mt-4 mb-2">
          <span className="text-sm">Archivo adjunto:</span>
          <input
            type="file"
            onChange={(e) => setArchivo(e.target.files ? e.target.files[0] : null)}
            className="mt-1"
          />
        </label>

        <button
          onClick={handleUpdate}
          className="bg-green-600 text-white px-3 py-1 rounded mt-2"
        >
          Guardar Cambios
        </button>
      </>
    )}
    </>
  );

}
