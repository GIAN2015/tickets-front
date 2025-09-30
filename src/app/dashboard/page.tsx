"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import instance from "@/lib/api";
import { useAuthStore } from "@/components/useAuthStore";

import {
  CheckCircle2,
  CircleSlash2,
  Clock,
  Filter,
  ListChecks,
  Plus,
  Search,
  XCircle,
  LayoutGrid,
  Table as TableIcon,
  User,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TicketStatusChanger from "@/components/TicketStatusChanger";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

// ===== Types =====
interface Usuario {
  id: number;
  username?: string;
  email?: string;
  role?: string;
}

type MinimalUser = { id: number; username?: string; email?: string };

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: string;
  prioridad: string;
  tipo?: string;
  categoria?: string;
  createdAt?: string | Date;
  creator?: MinimalUser;
  usuarioSolicitante?: MinimalUser | null;

  // claves para asignado
  assignedTo?: MinimalUser | null;
  assignedToId?: number | null;

  // banderas
  confirmadoPorUsuario?: boolean;
  rechazadoPorUsuario?: boolean;
};

// ===== Page =====
export default function Dashboard() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const userRole = (useAuthStore((s) => s.user?.role) || "")
    .toString()
    .toLowerCase();

  // normaliza id (puede venir string/number)
  const rawUserId = useAuthStore((s) => (s.user as any)?.id as any);
  const userId =
    typeof rawUserId === "string"
      ? parseInt(rawUserId, 10)
      : rawUserId ?? null;

  // data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(
    null
  );
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(
    null
  );
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  // vista: cards | table
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ticketsPorPagina = viewMode === "table" ? 12 : 9;

  const tipos = [
    { label: "Todos", value: null },
    { label: "Requerimiento", value: "requerimiento" },
    { label: "Incidencia", value: "incidencia" },
    { label: "Consulta", value: "consulta" },
  ];

  // ===== Data fetch =====
  useEffect(() => {
    if (!hasHydrated || !token) return;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const tRes = await instance.get("/tickets");
        const tData = Array.isArray(tRes.data)
          ? tRes.data
          : tRes.data?.tickets ?? [];
        setTickets(tData);
      } catch (err: any) {
        console.error("Error cargando tickets:", err?.response?.data || err);
        setErrorMsg(
          err?.response?.data?.message || "No se pudieron cargar los tickets."
        );
      } finally {
        setLoading(false);
      }
    };

    const loadUsers = async () => {
      if (userRole !== "ti") {
        setLoadingUsers(false);
        return;
      }
      try {
        setLoadingUsers(true);
        const uRes = await instance.get("/users/by-empresa");
        const uData = Array.isArray(uRes.data)
          ? uRes.data
          : uRes.data?.users ?? [];
        setUsuarios(uData);
      } catch (err: any) {
        console.error("Error cargando usuarios:", err?.response?.data || err);
      } finally {
        setLoadingUsers(false);
      }
    };

    load();
    loadUsers();
  }, [hasHydrated, token, userRole]);

  // ===== Acciones =====
  const confirmarResolucion = async (ticketId: number) => {
    try {
      await instance.patch(`/tickets/${ticketId}/confirmar`);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, confirmadoPorUsuario: true } : t
        )
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo confirmar la resolución");
    }
  };

  const rechazarResolucion = async (ticketId: number) => {
    try {
      await instance.patch(`/tickets/${ticketId}/rechazar`);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, rechazadoPorUsuario: true } : t
        )
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo rechazar la resolución");
    }
  };

  // ===== Filtros y paginación =====
  const ticketsFiltrados = useMemo(() => {
    let base = [...tickets];



    return base
      // estado en minúsculas para evitar mismatch
      .filter(
        (t) =>
          !estadoSeleccionado ||
          (t.status || "").toLowerCase() ===
            (estadoSeleccionado || "").toLowerCase()
      )
      .filter((t) => (t.status || "").toLowerCase() !== "completado")
      .filter(
        (t) =>
          !tipoSeleccionado ||
          (t.tipo || "").toLowerCase() === tipoSeleccionado.toLowerCase()
      )
      .filter((t) => !usuarioSeleccionado || t.creator?.id === usuarioSeleccionado)
      .filter(
        (t) =>
          !busquedaAplicada ||
          (t.title || "")
            .toLowerCase()
            .includes(busquedaAplicada.toLowerCase()) ||
          String(t.id).includes(busquedaAplicada)
      )
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }, [
    tickets,
    userRole,
    userId,
    estadoSeleccionado,
    tipoSeleccionado,
    usuarioSeleccionado,
    busquedaAplicada,
  ]);

  const totalPaginas =
    Math.ceil(ticketsFiltrados.length / ticketsPorPagina) || 1;
  const indiceInicio = (paginaActual - 1) * ticketsPorPagina;
  const ticketsPaginados = ticketsFiltrados.slice(
    indiceInicio,
    indiceInicio + ticketsPorPagina
  );

  // ===== UI helpers =====
  const badgeByStatus: Record<string, string> = {
    asignado:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200",
    "en progreso":
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200",
    resuelto:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200",
    completado:
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200",
  };

  const badgeByPriority: Record<string, string> = {
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

  // ===== Loading skeleton =====
  if (!hasHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-10 w-80 bg-slate-200 rounded" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Panel de Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Filtra, gestiona y actualiza el estado de tus tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Cards/Table */}
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setViewMode("cards");
                setPaginaActual(1);
              }}
              className={[
                "px-3 py-2 text-sm inline-flex items-center gap-2",
                viewMode === "cards"
                  ? "bg-slate-100 text-slate-900"
                  : "bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="w-4 h-4" />
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                setPaginaActual(1);
              }}
              className={[
                "px-3 py-2 text-sm inline-flex items-center gap-2 border-l border-slate-200",
                viewMode === "table"
                  ? "bg-slate-100 text-slate-900"
                  : "bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              aria-pressed={viewMode === "table"}
            >
              <TableIcon className="w-4 h-4" />
              Tabla
            </button>
          </div>

          {/* ❌ TI no ve "Crear Ticket" */}
          {userRole !== "ti" && (
            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2.5"
            >
              <Plus className="w-4 h-4" />
              Crear Ticket
            </Link>
          )}

          <Link
            href="/tickets/completados"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5"
          >
            <ListChecks className="w-4 h-4" />
            Completados
          </Link>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="border border-rose-200 p-4 rounded-lg bg-rose-50 text-rose-700 mb-6">
          {errorMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
        <div className="flex items-center gap-2 text-slate-600 mb-4">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Solo TI: filtro por creador (opcional) */}
          {userRole === "ti" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Usuario (creador)
              </label>
              <select
                value={usuarioSeleccionado ?? ""}
                onChange={(e) =>
                  setUsuarioSeleccionado(
                    e.target.value ? parseInt(e.target.value, 10) : null
                  )
                }
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm bg-white
                           focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
                disabled={loadingUsers}
              >
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username || u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado</label>
            <select
              value={estadoSeleccionado ?? ""}
              onChange={(e) => setEstadoSeleccionado(e.target.value || null)}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm bg-white
                         focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            >
              <option value="">Todos</option>
              <option value="asignado">Asignado</option>
              <option value="en progreso">En Progreso</option>
              <option value="resuelto">Resuelto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Búsqueda</label>
            <div className="flex">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="ID o título..."
                className="flex-1 h-10 border border-slate-300 rounded-l-lg px-3 text-sm bg-white
                           focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
              />
              <Button
                onClick={() => {
                  setBusquedaAplicada(busqueda);
                  setPaginaActual(1);
                }}
                className="h-10 rounded-l-none inline-flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs de tipo */}
        <div className="flex flex-wrap gap-2 mt-4">
          {tipos.map((t) => (
            <Button
              key={t.label}
              variant={tipoSeleccionado === t.value ? "default" : "outline"}
              onClick={() => {
                setTipoSeleccionado(t.value);
                setPaginaActual(1);
              }}
              className="h-8 px-3 text-xs"
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Vacío */}
      {!loading && ticketsFiltrados.length === 0 && (
        <div className="border border-slate-200 rounded-xl bg-white p-12 text-center text-slate-600">
          <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <CircleSlash2 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="font-medium">
            No se encontraron tickets con los filtros actuales.
          </p>
          <p className="text-sm text-slate-500 mt-1">Ajusta los filtros.</p>

          {userRole !== "ti" && (
            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-2 mt-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2.5"
            >
              <Plus className="w-4 h-4" />
              Crear Ticket
            </Link>
          )}
        </div>
      )}

      {/* ===== Vista CARDS ===== */}
      {viewMode === "cards" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(loading
            ? Array.from({ length: 6 }).map((_, i) => ({ id: i } as any))
            : ticketsPaginados
          ).map((ticket: Ticket, idx: number) =>
            loading ? (
              <div
                key={idx}
                className="h-56 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-24 bg-slate-200 rounded" />
                </div>
              </div>
            ) : (
              <Card
                key={ticket.id}
                className="shadow-sm border border-slate-200 hover:shadow-md transition"
              >
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="hover:underline"
                    >
                      #{ticket.id} — {ticket.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {ticket.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={
                        badgeByStatus[(ticket.status || "").toLowerCase()] ||
                        "text-slate-600 text-xs"
                      }
                    >
                      {ticket.status === "resuelto" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : ticket.status === "en progreso" ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : ticket.status === "asignado" ? (
                        <Search className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {ticket.status}
                    </span>

                    <span
                      className={
                        badgeByPriority[(ticket.prioridad || "").toLowerCase()] ||
                        "text-slate-600 text-xs"
                      }
                    >
                      Prioridad: {ticket.prioridad}
                    </span>

                    {ticket.tipo && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                        Tipo: {ticket.tipo}
                      </span>
                    )}
                    {ticket.categoria && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                        Categoría: {ticket.categoria}
                      </span>
                    )}
                  </div>

                  {ticket.creator && (
                    <p className="text-slate-500">
                      <span className="font-medium text-slate-700">Creador:</span>{" "}
                      {ticket.creator.username || ticket.creator.email}
                    </p>
                  )}

                  {/* Acciones */}
                  <TicketStatusChanger
                    ticket={ticket}
                    ticketId={ticket.id}
                    currentStatus={ticket.status}
                    currentPrioridad={ticket.prioridad}
                    confirmadoPorUsuario={ticket.confirmadoPorUsuario}
                    rechazadoPorUsuario={ticket.rechazadoPorUsuario}
                    onStatusChanged={(newStatus) => {
                      setTickets((prev) =>
                        prev.map((t) =>
                          t.id === ticket.id ? { ...t, status: newStatus } : t
                        )
                      );
                    }}
                    onPrioridadChanged={(newPrioridad) => {
                      setTickets((prev) =>
                        prev.map((t) =>
                          t.id === ticket.id
                            ? { ...t, prioridad: newPrioridad }
                            : t
                        )
                      );
                    }}
                    message="Resolviendo ticket..."
                  />

                  {/* Confirmar / Rechazar para rol user */}
                  {userRole === "user" &&
                    ticket.status === "resuelto" &&
                    !ticket.confirmadoPorUsuario && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => confirmarResolucion(ticket.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                        >
                          Confirmar
                        </Button>
                        {!ticket.rechazadoPorUsuario && (
                          <Button
                            onClick={() => rechazarResolucion(ticket.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white flex-1"
                          >
                            Rechazar
                          </Button>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* ===== Vista TABLA ===== */}
      {viewMode === "table" && !loading && ticketsFiltrados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Prioridad</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 font-medium">Creador</th>
                <th className="text-left px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ticketsPaginados.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 text-slate-700">{t.id}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    <Link href={`/tickets/${t.id}`} className="hover:underline">
                      {t.title}
                    </Link>
                    <div className="text-xs text-slate-500 line-clamp-1">
                      {t.description}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        badgeByStatus[(t.status || "").toLowerCase()] ||
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200"
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        badgeByPriority[(t.prioridad || "").toLowerCase()] ||
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200"
                      }
                    >
                      {t.prioridad}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{t.tipo || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{t.categoria || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      <User className="w-3.5 h-3.5" />
                      {t.creator?.username || t.creator?.email || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="text-sky-700 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {ticketsFiltrados.length > 0 && !loading && (
        <div className="mt-8">
          {/* Info de rango */}
          <div className="mb-2 text-center text-sm text-slate-600">
            Mostrando{" "}
            <span className="font-medium text-slate-800">{indiceInicio + 1}</span>
            {" – "}
            <span className="font-medium text-slate-800">
              {Math.min(
                indiceInicio + ticketsPaginados.length,
                ticketsFiltrados.length
              )}
            </span>{" "}
            de{" "}
            <span className="font-medium text-slate-800">
              {ticketsFiltrados.length}
            </span>
          </div>

          {/* Controles */}
          <nav
            className="flex items-center justify-center gap-2"
            role="navigation"
            aria-label="Paginación"
          >
            <Button
              type="button"
              variant="outline"
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1.5"
              aria-label="Página anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Anterior
            </Button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPaginaActual(n)}
                  aria-current={paginaActual === n ? "page" : undefined}
                  className={[
                    "h-9 min-w-9 px-3 rounded-md text-sm transition",
                    paginaActual === n
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
              onClick={() =>
                setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))
              }
              className="inline-flex items-center gap-1.5"
              aria-label="Página siguiente"
            >
              Siguiente
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
