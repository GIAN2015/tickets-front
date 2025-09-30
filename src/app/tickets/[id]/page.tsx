// src/app/tickets/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import instance from "@/lib/api";
import TicketStatusChanger from "@/components/TicketStatusChanger";
import { useAuthStore } from "@/components/useAuthStore";
import AdminSLAForm from "@/components/AdminSLAForm";
import AdminAssignPanel from "@/components/AdminAssignPanel";

import {
  ArrowRightIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  PaperClipIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

/* ========= Config de archivos ========= */
const FILES_BASE =
  process.env.NEXT_PUBLIC_FILES_BASE || "http://localhost:3001"; // ajusta en prod

/* ========= Tipos ========= */
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
  usuarioSolicitante?: { id: number; username?: string; email?: string } | null;
  creator?: { id: number; username?: string; email?: string } | null;
  archivoNombre?: string[];
  slaTotalMinutos?: number;
  slaStartAt?: string;
  slaGreenEndAt?: string;
  slaYellowEndAt?: string;
  deadlineAt?: string;
};

type HistItem = {
  id: number | string;
  fecha: string;
  actualizadoPor?: { username?: string; email?: string } | null;
  statusAnterior?: string | null;
  statusNuevo?: string | null;
  prioridadAnterior?: string | null;
  prioridadNueva?: string | null;
  mensaje?: string | null;
  adjuntoNombre?: string[] | null;
};

/* ========= Badges helpers ========= */
const statusBadge = (s?: string) => {
  const map: Record<string, string> = {
    "no iniciado":
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200",
    asignado:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200",
    "en proceso":
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200",
    resuelto:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200",
    completado:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200",
  };
  return (
    map[(s || "").toLowerCase()] ||
    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200"
  );
};

const prioridadBadge = (p?: string) => {
  const map: Record<string, string> = {
    muy_bajo:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200",
    bajo:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200",
    media:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200",
    alta:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200",
    muy_alta:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200",
  };
  return map[(p || "").toLowerCase()] || map.media;
};

/* ========= SLA helpers ========= */
function computeSlaPhase(ticket: Ticket) {
  if (!ticket.slaStartAt || !ticket.deadlineAt) {
    return { phase: "sin_sla" as const, progress: 0, color: "#94a3b8" };
  }
  const now = Date.now();
  const start = new Date(ticket.slaStartAt).getTime();
  const deadline = new Date(ticket.deadlineAt).getTime();
  const greenEnd = ticket.slaGreenEndAt ? new Date(ticket.slaGreenEndAt).getTime() : start;
  const yellowEnd = ticket.slaYellowEndAt ? new Date(ticket.slaYellowEndAt).getTime() : greenEnd;

  const total = Math.max(1, deadline - start);
  const elapsed = Math.max(0, Math.min(total, now - start));
  const progress = Math.round((elapsed / total) * 100);

  let phase: "verde" | "amarillo" | "rojo";
  if (now <= greenEnd) phase = "verde";
  else if (now <= yellowEnd) phase = "amarillo";
  else phase = "rojo";

  const color =
    phase === "verde" ? "#10b981" : phase === "amarillo" ? "#f59e0b" : "#ef4444";

  return { phase, progress, color };
}

function phaseLabel(phase: "verde" | "amarillo" | "rojo" | "sin_sla") {
  switch (phase) {
    case "verde": return "Dentro de SLA";
    case "amarillo": return "Riesgo de vencer";
    case "rojo": return "SLA vencido";
    default: return "SLA no configurado";
  }
}

function phaseBadgeClass(phase: "verde" | "amarillo" | "rojo" | "sin_sla") {
  const map: Record<string, string> = {
    verde: "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200",
    amarillo: "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200",
    rojo: "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200",
    sin_sla: "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200",
  };
  return map[phase] || map.sin_sla;
}

function formatRemaining(deadlineISO?: string) {
  if (!deadlineISO) return "—";
  const ms = new Date(deadlineISO).getTime() - Date.now();
  if (ms <= 0) return "0h";
  const minutes = Math.floor(ms / 60000);
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.floor((minutes % (60 * 24)) / 60);
  const m = minutes % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

/* ========= Página ========= */
export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const paramId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const userRole = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [historial, setHistorial] = useState<HistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [mensaje, setMensaje] = useState("");

  // tick para forzar re-render del SLA cada 60s
  const [, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000); // 1 min
    return () => clearInterval(id);
  }, []);

  const fetchTicket = useCallback(async () => {
    if (!paramId) return;
    try {
      setLoading(true);
      const { data } = await instance.get(`/tickets/${paramId}`);
      setTicket(data);
    } catch (err) {
      console.error("Error al obtener ticket:", err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [paramId]);

  const fetchHistorial = useCallback(async () => {
    if (!paramId) return;
    try {
      setLoadingHist(true);
      const { data } = await instance.get(`/tickets/${paramId}/historial`);
      setHistorial(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al obtener historial:", err);
      setHistorial([]);
    } finally {
      setLoadingHist(false);
    }
  }, [paramId]);

  useEffect(() => {
    if (!hasHydrated || !paramId) return;
    fetchTicket();
  }, [hasHydrated, paramId, fetchTicket]);

  useEffect(() => {
    if (!hasHydrated || !paramId) return;
    fetchHistorial();
  }, [hasHydrated, paramId, fetchHistorial]);

  const refreshTodo = useCallback(async () => {
    await Promise.all([fetchTicket(), fetchHistorial()]);
  }, [fetchTicket, fetchHistorial]);

  const confirmarResolucion = async () => {
    if (!ticket) return;
    try {
      await instance.patch(`/tickets/${ticket.id}/confirmar`);
      await refreshTodo();
    } catch (err) {
      console.error(err);
      alert("No se pudo confirmar la resolución.");
    }
  };

  const rechazarResolucion = async () => {
    if (!ticket) return;
    try {
      await instance.patch(`/tickets/${ticket.id}/rechazar`);
      await refreshTodo();
    } catch (err) {
      console.error(err);
      alert("No se pudo rechazar la resolución.");
    }
  };

  if (!hasHydrated) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-6 w-80 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto p-8 text-slate-600">Cargando ticket…</div>;
  }

  if (!ticket) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          No se encontró el ticket.
        </div>
      </div>
    );
  }

  // SLA visual
  const { phase, progress, color } = computeSlaPhase(ticket);
  const slaBadge = phaseBadgeClass(phase);
  const remaining = formatRemaining(ticket.deadlineAt);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
      {/* Toolbar superior */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Ticket #{ticket.id} — {ticket.title}
            </h1>
            <p className="text-slate-500 mt-1">{ticket.description}</p>
          </div>
        </div>

        {/* Panel ADMIN: asignar TI + SLA */}
        {(userRole === "admin" || userRole === "super-admi") && (
          <div className="mt-6">
            <AdminAssignPanel ticketId={ticket.id} onChanged={refreshTodo} />
          </div>
        )}

        {/* Meta del ticket */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">Estado</span>
            <span className={statusBadge(ticket.status)}>{ticket.status}</span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">Prioridad</span>
            <span className={prioridadBadge(ticket.prioridad)}>{ticket.prioridad}</span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">Tipo</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {ticket.tipo}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">Categoría</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {ticket.categoria}
            </span>
          </div>

          {/* SLA card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">SLA</span>
            <div className="space-y-2">
              <span className={slaBadge}>{phaseLabel(phase)}</span>
              {ticket.deadlineAt && (
                <div className="text-xs text-slate-500">
                  Tiempo restante: <span className="font-medium">{remaining}</span>
                </div>
              )}
              <div className="h-2 bg-slate-200 rounded overflow-hidden">
                <div className="h-2 transition-all" style={{ width: `${progress}%`, background: color }} />
              </div>

              {(userRole === "admin" || userRole === "super-admi") && (
                <div className="pt-1">
                  <AdminSLAForm
                    ticketId={ticket.id}
                    currentTotalMin={ticket.slaTotalMinutos}
                    onSaved={refreshTodo}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">Solicitante</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <UserCircleIcon className="h-4 w-4" />
              {ticket.usuarioSolicitante?.username ||
                ticket.usuarioSolicitante?.email ||
                "No asignado"}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-500">Creador</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <UserCircleIcon className="h-4 w-4" />
              {ticket.creator?.username || ticket.creator?.email || "—"}
            </span>
          </div>
        </div>

        {/* Controles TI / Adjuntos / Estado */}
        <div className="mt-6">
          <TicketStatusChanger
            ticket={ticket}
            ticketId={ticket.id}
            currentStatus={ticket.status}
            currentPrioridad={ticket.prioridad}
            confirmadoPorUsuario={ticket.confirmadoPorUsuario}
            rechazadoPorUsuario={ticket.rechazadoPorUsuario}
            onStatusChanged={(newStatus) =>
              setTicket((prev) => (prev ? { ...prev, status: newStatus } : prev))
            }
            onPrioridadChanged={(newPrioridad) =>
              setTicket((prev) => (prev ? { ...prev, prioridad: newPrioridad } : prev))
            }
            message={mensaje}
            refreshHistorial={refreshTodo}
          />
        </div>

        {/* Adjuntos */}
        {ticket.archivoNombre?.length ? (
          <div className="mt-6">
            <div className="text-sm text-slate-700 mb-2 flex items-center gap-2">
              <PaperClipIcon className="h-4 w-4" />
              <span>Adjuntos</span>
            </div>
            <ul className="space-y-1">
              {ticket.archivoNombre.map((file, idx) => (
                <li key={`${file}-${idx}`}>
                  <a
                    href={`${FILES_BASE}/tickets/${file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:underline text-sm"
                  >
                    {file}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Acciones del usuario (confirmar / rechazar) */}
        {userRole === "user" &&
          ticket.status === "resuelto" &&
          !ticket.confirmadoPorUsuario && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={confirmarResolucion}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirmar resolución
              </Button>
              {!ticket.rechazadoPorUsuario && (
                <Button
                  onClick={rechazarResolucion}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Rechazar resolución
                </Button>
              )}
            </div>
          )}
      </div>

      {/* Historial */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-700">
          <ClockIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Historial de cambios</h2>
        </div>

        {loadingHist ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-20 bg-slate-200 rounded" />
          </div>
        ) : historial.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
            No hay historial aún.
          </div>
        ) : (
          <ol className="relative border-l border-slate-200 pl-6 space-y-6">
            {historial.map((h, i) => (
              <li key={h.id ?? i} className="relative group">
                <span className="absolute -left-[9px] top-[2px] inline-flex h-4 w-4 rounded-full bg-sky-600 ring-4 ring-sky-100" />
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>{new Date(h.fecha).toLocaleString()}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      {h.statusNuevo || h.statusAnterior || ticket.status}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCircleIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">
                        {h.actualizadoPor?.username || h.actualizadoPor?.email || "Usuario"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-slate-500">Estado:</span>
                      {h.statusAnterior && h.statusNuevo && h.statusAnterior !== h.statusNuevo ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="rounded-md bg-slate-50 px-2 py-0.5 border border-slate-200">
                            {h.statusAnterior}
                          </span>
                          <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 border border-emerald-200 text-emerald-700">
                            {h.statusNuevo}
                          </span>
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-50 px-2 py-0.5 border border-slate-200">
                          {h.statusNuevo || h.statusAnterior || ticket.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-slate-500">Prioridad:</span>
                      {h.prioridadAnterior &&
                      h.prioridadNueva &&
                      h.prioridadAnterior !== h.prioridadNueva ? (
                        <span className="inline-flex items-center gap-2">
                          <span className={prioridadBadge(h.prioridadAnterior)}>
                            {h.prioridadAnterior}
                          </span>
                          <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                          <span className={prioridadBadge(h.prioridadNueva)}>
                            {h.prioridadNueva}
                          </span>
                        </span>
                      ) : (
                        <span className={prioridadBadge(h.prioridadNueva || h.prioridadAnterior || ticket.prioridad)}>
                          {h.prioridadNueva || h.prioridadAnterior || ticket.prioridad}
                        </span>
                      )}
                    </div>

                    {h.mensaje ? <p className="text-slate-600 italic">“{h.mensaje}”</p> : null}

                    {h.adjuntoNombre && h.adjuntoNombre.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-slate-700 text-sm mb-1">
                          <PaperClipIcon className="h-4 w-4" />
                          <span>Adjuntos</span>
                        </div>
                        <ul className="list-disc pl-5 text-sky-700">
                          {h.adjuntoNombre.map((file, idx) => (
                            <li key={`${file}-${idx}`}>
                              <a
                                href={`${FILES_BASE}/tickets/${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
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
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Aviso sin privilegios (muestra si NO eres TI; ajusta si quieres) */}
      {userRole !== "ti" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Visor de ticket</p>
            <p>No cuentas con privilegios para modificar estado o prioridad.</p>
          </div>
        </div>
      )}
    </div>
  );
}
