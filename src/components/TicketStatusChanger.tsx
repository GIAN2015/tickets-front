'use client';

import { useEffect, useState } from 'react';
import instance, { resetearRechazoResolucion } from '@/lib/api';
import { Check, AlertTriangle, Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const role = (useAuthStore((s) => s.user?.role) || '').toString().toLowerCase();
  const isTI = role === 'ti';
  const isUser = role === 'user';

  // estado/prioridad locales para edición
  const [status, setStatus] = useState(currentStatus);
  const [prioridad, setPrioridad] = useState(currentPrioridad);
  const [localMessage, setLocalMessage] = useState(message || '');
  const [showRechazoMessage, setShowRechazoMessage] = useState(!!rechazadoPorUsuario);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [aceptado, setAceptado] = useState(!!ticket?.usuarioSolicitante);
  const [saving, setSaving] = useState(false);

  // 🔒 UI se oculta SOLO si el servidor ya dejó el ticket en completado
  const [completed, setCompleted] = useState(
    (currentStatus || '').toLowerCase() === 'completado'
  );

  // permisos por rol
  const canChangeState = isTI;
  const canAccept = isTI && !aceptado;
  const canAttach = (isTI || isUser) && !completed;
  const canSave = (isTI || isUser) && !completed;

  const allOptions = ['no iniciado', 'asignado', 'en proceso', 'resuelto', 'completado'];
  const visibleOptions = canChangeState
    ? allOptions.filter((opt) => (opt === 'completado' ? !!confirmadoPorUsuario : true))
    : [];

  useEffect(() => {
    setShowRechazoMessage(!!rechazadoPorUsuario);
  }, [rechazadoPorUsuario]);

  const handleFilesChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.currentTarget.files;
    if (!files?.length) return;
    const toAdd = Array.from(files);
    const combined = archivos.concat(toAdd).slice(0, 3);
    setArchivos(combined);
    e.currentTarget.value = '';
  };

  const removeFile = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);

      // solo TI resetea rechazo antes de actualizar
      if (isTI) await resetearRechazoResolucion(ticketId);

      let updated: any;

      if (archivos.length > 0) {
        const formData = new FormData();
        if (isTI) {
          formData.append('status', status);
          formData.append('prioridad', prioridad);
        }
        formData.append('message', localMessage || '');
        archivos.forEach((f) => formData.append('archivos', f));

        const res = await instance.patch(`/tickets/${ticketId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updated = res.data;
      } else {
        const body: any = { message: localMessage };
        if (isTI) {
          body.status = status;
          body.prioridad = prioridad;
        }
        const res = await instance.patch(`/tickets/${ticketId}`, body);
        updated = res.data;
      }

      // reflejar cambios devueltos por el backend
      if (isTI) {
        onStatusChanged(updated.status);
        onPrioridadChanged(updated.prioridad);
        setStatus(updated.status);
        setPrioridad(updated.prioridad);
      }

      // ⬇️ aquí es la magia: cerrar UI solo si el backend dejó status en "completado"
      const serverCompleted = (updated.status || '').toLowerCase() === 'completado';
      if (serverCompleted) setCompleted(true);

      setArchivos([]);
      if (isTI) setShowRechazoMessage(false);
      await refreshHistorial?.();

      alert('✅ Cambios guardados correctamente');
    } catch (err: any) {
      console.error('❌ Error al actualizar:', err?.response?.data || err);
      alert(err?.response?.data?.message || 'No se pudo actualizar el ticket.');
    } finally {
      setSaving(false);
    }
  };

  const aceptarTicket = async () => {
    try {
      await instance.patch(`/tickets/${ticketId}/aceptar`);
      setAceptado(true);
      await refreshHistorial?.();
      alert('✅ Ahora eres el usuario solicitante del ticket.');
    } catch (err: any) {
      console.error(err?.response?.data || err);
      alert(err?.response?.data?.message || 'No se pudo aceptar el ticket.');
    }
  };

  // Si es otro rol, no mostramos nada (solo aviso si aplica)
  if (!isTI && !isUser) {
    return (
      <>
        {showRechazoMessage && isTI && (
          <p className="mt-2 text-sm text-rose-600 font-medium">
            ⚠️ El usuario rechazó la resolución del ticket.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Aviso de rechazo (solo TI) */}
      {showRechazoMessage && isTI && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">El usuario rechazó la resolución.</p>
            <p className="text-xs">Al guardar cambios, se reinicia el estado de rechazo.</p>
          </div>
        </div>
      )}

      {/* Aceptar ticket (solo TI) */}
      {isTI && !aceptado && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-amber-800 text-sm mb-2">
            ⚠️ Este ticket aún no tiene un usuario solicitante asignado.
          </p>
          <Button type="button" onClick={aceptarTicket} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="w-4 h-4 mr-2" />
            Aceptar Ticket
          </Button>
        </div>
      )}

      {/* Estado/Prioridad (solo TI). Mantiene editable aunque elija "completado"; se cierra tras guardar */}
      {canChangeState && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 text-sm">Estado</Label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={completed} // si ya quedó completado en servidor, bloquear edición
            >
              {visibleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {status.toLowerCase() === 'completado' && !confirmadoPorUsuario && (
              <p className="mt-1 text-xs text-slate-500">* “Completado” requiere confirmación del usuario.</p>
            )}
          </div>

          <div>
            <Label className="text-slate-700 text-sm">Prioridad</Label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              disabled={completed}
            >
              <option value="muy_bajo">Muy Baja</option>
              <option value="bajo">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="muy_alta">Muy Alta</option>
            </select>
          </div>
        </div>
      )}

      {/* Mensaje — oculto si el servidor ya lo dejó completado */}
      {!completed && (
        <div>
          <Label className="text-slate-700 text-sm">Mensaje</Label>
          <textarea
            className="mt-1 w-full min-h-[90px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={localMessage}
            onChange={(e) => setLocalMessage(e.target.value)}
            placeholder={isUser ? 'Describe tu comentario o actualización…' : 'Detalle de la intervención…'}
          />
        </div>
      )}

      {/* Adjuntos — oculto si el servidor ya lo dejó completado */}
      {canAttach && !completed && (
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
            <span className="text-xs text-slate-500">Se reemplazan/unen hasta un máximo de 3.</span>
          </div>

          {archivos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {archivos.map((f, idx) => (
                <li
                  key={`${f.name}-${idx}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => removeFile(idx)} className="text-rose-600 hover:underline">
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Guardar — oculto si el servidor ya lo dejó completado */}
      {canSave && !completed && (
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
      )}
    </div>
  );
}
