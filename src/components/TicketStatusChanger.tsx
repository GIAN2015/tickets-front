'use client';

import { getUsuarios, resetearRechazoResolucion } from '@/lib/api';
import { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
import { title } from 'process';
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  role: string;
}

export default function TicketStatusChanger({
  ticket,
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
  ticket: any;
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
  const [archivos, setArchivos] = useState<File[]>([]);

  const [dbStatus, setDbStatus] = useState(currentStatus);




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

      if (archivos?.length && archivos.length > 0) {
        // Si hay archivo → multipart/form-data
        const formData = new FormData();
        formData.append('status', status);
        formData.append('prioridad', prioridad);
        formData.append('message', message || '');
        archivos.forEach((file) => {
          formData.append('archivos', file); // 👈 debe llamarse igual que en FilesInterceptor('archivos')
        });
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

      // intenta parsear como JSON siempre
      let data: any;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          `Error al actualizar (${res.status}): ${data?.message || 'Sin detalle'}`
        );
      }

      // aquí sí tienes tu objeto actualizado
      // aquí sí tienes tu objeto actualizado
      setRechazadoLocal(false);
      const updated = data;

      // 👇 limpiar los archivos para que no se acumulen en el próximo update
      setArchivos([]);


      // Enviar correo al creador del ticket


      // Actualizamos estado local y ocultamos el mensaje de rechazo
      onStatusChanged(updated.status);
      onPrioridadChanged(updated.prioridad);
      setShowRechazoMessage(false);


  
      // actualizas estados locales
      onStatusChanged?.(updated.status);
      onPrioridadChanged?.(updated.prioridad);




      window.location.reload();
      alert('Ticket actualizado con éxito y correo enviado');
    }  catch (err: any) {
  console.error("❌ Error en handleSubmit:", err);
  if (err instanceof Error) {
    console.error("📄 Mensaje:", err.message);
  } else {
    console.error("📄 Detalle (stringificado):", JSON.stringify(err));
  }
  alert('Error al crear ticket o enviar correo');
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
      {dbStatus !== 'completado' && (
        <>
          <label className="block mt-4 mb-2">
            <span className="text-sm">Archivos adjuntos (máx 3):</span>
            <input
              type="file"
              multiple
              accept=".jpg,.png,.pdf,.docx,.xlsx" // opcional limitar tipos
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length > 3) {
                  alert("Solo puedes subir un máximo de 3 archivos");
                  return;
                }
                setArchivos(files);
              }}

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