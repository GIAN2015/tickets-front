'use client';

import { useEffect, useState } from 'react';
import instance from '@/lib/api';
import { resetearRechazoResolucion } from '@/lib/api';
import { Check, AlertTriangle, Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // opcional si tienes util de classnames
import { useAuthStore } from './useAuthStore';

type Props = {
  ticket: any;
  ticketId: number;
  message?: string;
  currentStatus: string;
  currentPrioridad: string;
  onStatusChanged: (newStatus: string) => void;
  onPrioridadChanged: (newPrioridad: string) => void;
  confirmadoPorUsuario?: boolean;
  rechazadoPorUsuario?: boolean;
  /** Si la vista de historial necesita refrescar, lo llamamos al terminar */
  refreshHistorial?: () => Promise<void>;
};

export default function TicketStatusChanger({
  ticket,
  ticketId,
  message,
  currentStatus,
  currentPrioridad,
  onStatusChanged,
  onPrioridadChanged,
  confirmadoPorUsuario = false,
  rechazadoPorUsuario = false,
  refreshHistorial,
}: Props) {
  // 🔐 Rol desde zustand
  const role = (useAuthStore((s) => s.user?.role) || '')
    .toString()
    .toLowerCase();

  const isTI = role === 'ti';

  // 🧠 Estado local (controlado)
  const [status, setStatus] = useState(currentStatus);
  const [prioridad, setPrioridad] = useState(currentPrioridad);
  const [showRechazoMessage, setShowRechazoMessage] =
    useState(!!rechazadoPorUsuario);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [aceptado, setAceptado] = useState(!!ticket?.usuarioSolicitante);
  const [saving, setSaving] = useState(false);

  // Estados permitidos
  const allOptions = ['no iniciado', 'asignado', 'en proceso', 'resuelto', 'completado'];

  // Solo TI ve y mueve estados; `completado` solo si usuario lo confirmó
  const visibleOptions = isTI
    ? allOptions.filter((opt) => (opt === 'completado' ? !!confirmadoPorUsuario : true))
    : [];

  useEffect(() => {
    setShowRechazoMessage(!!rechazadoPorUsuario);
  }, [rechazadoPorUsuario]);

  const handleFilesChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.currentTarget.files;
    if (!files?.length) return;
    const toAdd = Array.from(files);
    const combined = archivos.concat(toAdd).slice(0, 3); // máx 3
    setArchivos(combined);
    e.currentTarget.value = ''; // permite volver a seleccionar los mismos archivos
  };

  const removeFile = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);

      // Si hubo rechazo, lo reseteamos antes de actualizar
      await resetearRechazoResolucion(ticketId);

      if (archivos.length > 0) {
        const formData = new FormData();
        formData.append('status', status);
        formData.append('prioridad', prioridad);
        formData.append('message', message || '');
        archivos.forEach((f) => formData.append('archivos', f));

        const { data: updated } = await instance.patch(
          `/tickets/${ticketId}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        // Actualiza estado en el padre
        onStatusChanged(updated.status);
        onPrioridadChanged(updated.prioridad);
      } else {
        const { data: updated } = await instance.patch(`/tickets/${ticketId}`, {
          status,
          prioridad,
          message,
        });

        onStatusChanged(updated.status);
        onPrioridadChanged(updated.prioridad);
      }

      // Limpia y oculta mensaje de rechazo
      setArchivos([]);
      setShowRechazoMessage(false);

      // Refresca historial si se envió
      await refreshHistorial?.();

      alert('✅ Ticket actualizado correctamente');
    } catch (err: any) {
      console.error('❌ Error al actualizar:', err?.response?.data || err);
      alert(err?.response?.data?.message || 'No se pudo actualizar el ticket.');
    } finally {
      setSaving(false);
    }
  };

  const aceptarTicket = async () => {
    try {
      const { data } = await instance.patch(`/tickets/${ticketId}/aceptar`);
      setAceptado(true);
      await refreshHistorial?.();
      alert('✅ Ahora eres el usuario solicitante del ticket.');
    } catch (err: any) {
      console.error(err?.response?.data || err);
      alert(err?.response?.data?.message || 'No se pudo aceptar el ticket.');
    }
  };

  // Si no es TI, no mostramos controles (solo avisos)
  if (!isTI) {
    return (
      <>
        {rechazadoPorUsuario && (
          <p className="mt-2 text-sm text-rose-600 font-medium">
            ⚠️ El usuario rechazó la resolución del ticket.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Aviso de rechazo */}
      {showRechazoMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">El usuario rechazó la resolución.</p>
            <p className="text-xs">
              Al guardar cambios, se reinicia el estado de rechazo.
            </p>
          </div>
        </div>
      )}

      {/* Aceptar ticket (si TI y sin solicitante) */}
      {!aceptado && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-amber-800 text-sm mb-2">
            ⚠️ Este ticket aún no tiene un usuario solicitante asignado.
          </p>
          <Button
            type="button"
            onClick={aceptarTicket}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Aceptar Ticket
          </Button>
        </div>
      )}

      {/* Controles de estado/prioridad */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-700 text-sm">Estado</Label>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {visibleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {status === 'completado' && !confirmadoPorUsuario && (
            <p className="mt-1 text-xs text-slate-500">
              * “Completado” requiere confirmación del usuario.
            </p>
          )}
        </div>

        <div>
          <Label className="text-slate-700 text-sm">Prioridad</Label>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
      </div>

      {/* Adjuntos */}
      <div>
        <Label className="text-slate-700 text-sm">Adjuntar archivos (máx. 3)</Label>
        <div className="mt-1 flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Upload className="w-4 h-4" />
            Subir
            <input
              type="file"
              multiple
              accept=".jpg,.png,.pdf,.docx,.xlsx"
              onChange={handleFilesChange}
              className="hidden"
            />
          </label>
          <span className="text-xs text-slate-500">
            Se reemplazan/unen hasta un máximo de 3.
          </span>
        </div>

        {archivos.length > 0 && (
          <ul className="mt-3 space-y-1">
            {archivos.map((f, idx) => (
              <li
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-rose-600 hover:underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Guardar */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleUpdate}
          disabled={saving}
          className="bg-sky-600 hover:bg-sky-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
