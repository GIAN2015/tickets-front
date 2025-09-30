'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import instance from '@/lib/api';
import { useAuthStore } from '@/components/useAuthStore';
import {
  ArrowLeft,
  Download,
  Filter,
  Search,
  User,
  ListChecks,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ===== Tipos =====
interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;           // 'completado' | ...
  prioridad: string;
  tipo: string;
  categoria: string;
  creator: { username?: string; email?: string };
  assignedTo?: { username?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

// ===== Helpers =====
function fmtDateTimeLima(date: string) {
  return new Date(date).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function humanDuration(start: string, end: string): string | null {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs <= 0) return null;

  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} día(s) ${hours % 24}h ${mins % 60}m`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m`;
  return null;
}

export default function TicketsCompletadosPage() {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros UI controlados
  const [selectedUser, setSelectedUser] = useState('');
  const [searchId, setSearchId] = useState('');
  const [applyKey, setApplyKey] = useState(0);

  // cargar tickets completados
  useEffect(() => {
    if (!hasHydrated) return;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const { data } = await instance.get('/tickets');
        const raw: Ticket[] = Array.isArray(data) ? data : data?.tickets ?? [];
        const done = raw.filter((t) => (t.status || '').toLowerCase() === 'completado');
        setTickets(done);
      } catch (err: any) {
        console.error('Error al cargar tickets:', err?.response?.data || err);
        setErrorMsg(err?.response?.data?.message || 'No se pudieron cargar los tickets.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [hasHydrated]);

  // usuarios únicos para filtro
  const users = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      const u = t.creator?.username || t.creator?.email;
      if (u) set.add(u);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  // aplicar filtros
  const filteredTickets = useMemo(() => {
    const idq = searchId.trim();
    const uq = selectedUser.trim();

    return tickets.filter((t) => {
      const byUser = uq ? (t.creator?.username || t.creator?.email) === uq : true;
      const byId = idq ? String(t.id).includes(idq) : true;
      return byUser && byId;
    });
  }, [tickets, applyKey]);

  const aplicarFiltro = () => setApplyKey((k) => k + 1);

  const exportarExcel = () => {
    const datos = filteredTickets.map((t) => ({
      ID: t.id,
      Título: t.title,
      Descripción: t.description,
      Estado: t.status,
      Prioridad: t.prioridad,
      Tipo: t.tipo,
      Categoría: t.categoria,
      Creador: t.creator?.username || t.creator?.email,
      Asignado: t.assignedTo?.username || t.assignedTo?.email || '—',
      Fecha_Creación: fmtDateTimeLima(t.createdAt),
      Fecha_Completado: fmtDateTimeLima(t.updatedAt),
      Duración: humanDuration(t.createdAt, t.updatedAt) || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets Completados');
    XLSX.writeFile(wb, 'tickets_completados.xlsx');
  };

  // helpers UI (badges)
  const badgeByPriority: Record<string, string> = {
    muy_bajo:
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200',
    bajo:
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200',
    media:
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200',
    alta:
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200',
    muy_alta:
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200',
  };

  // ===== Loading =====
  if (!hasHydrated) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-10 w-80 bg-slate-200 rounded" />
          <div className="h-56 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toolbar superior */}
      <div className="flex items-center justify-between mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2.5"
          >
            <ListChecks className="w-4 h-4" />
            Ir al dashboard
          </Link>
          <Button
            type="button"
            onClick={exportarExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Encabezado */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
        <div className="flex items-center gap-2 text-slate-700 mb-4">
          <Filter className="w-4 h-4" />
          <h1 className="text-lg font-semibold">Tickets Completados</h1>
        </div>

        {/* Filtros */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Usuario</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Buscar por ID</label>
            <input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Ej. 1024"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={aplicarFiltro}
              className="h-10 w-full inline-flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* Estados */}
      {errorMsg && (
        <div className="border border-rose-200 p-4 rounded-lg bg-rose-50 text-rose-700 mb-6">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-5 bg-slate-200 rounded w-1/2" />
            <div className="h-40 bg-slate-200 rounded" />
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
          <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <p className="font-medium">No hay tickets completados que coincidan con la búsqueda.</p>
          <p className="text-sm text-slate-500 mt-1">Ajusta los filtros o vuelve al panel.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2.5"
          >
            <ListChecks className="w-4 h-4" />
            Volver al dashboard
          </Link>
        </div>
      ) : (
        // Tabla responsiva (sin espacios en <tr>)
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                {[
                  'ID',
                  'Título',
                  'Estado',
                  'Prioridad',
                  'Tipo',
                  'Categoría',
                  'Creador',
                  'Asignado a',
                  'Creado',
                  'Completado',
                  'Duración',
                  'Acciones',
                ].map((label) => (
                  <th key={label} className="text-left px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => {
                const dur = humanDuration(t.createdAt, t.updatedAt);
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    {[
                      <td key="id" className="px-4 py-3 text-slate-700">{t.id}</td>,
                      <td key="title" className="px-4 py-3 text-slate-900 font-medium">{t.title}</td>,
                      <td key="status" className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                          {t.status}
                        </span>
                      </td>,
                      <td key="prio" className="px-4 py-3">
                        <span className={badgeByPriority[(t.prioridad || '').toLowerCase()] || 'text-slate-700 text-xs'}>
                          {t.prioridad}
                        </span>
                      </td>,
                      <td key="tipo" className="px-4 py-3 text-slate-700">{t.tipo}</td>,
                      <td key="cat" className="px-4 py-3 text-slate-700">{t.categoria}</td>,
                      <td key="creator" className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          <User className="w-3.5 h-3.5" />
                          {t.creator?.username || t.creator?.email}
                        </span>
                      </td>,
                      <td key="assigned" className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          <User className="w-3.5 h-3.5" />
                          {t.assignedTo?.username || t.assignedTo?.email || '—'}
                        </span>
                      </td>,
                      <td key="created" className="px-4 py-3 text-slate-700">{fmtDateTimeLima(t.createdAt)}</td>,
                      <td key="done" className="px-4 py-3 text-slate-700">{fmtDateTimeLima(t.updatedAt)}</td>,
                      <td key="dur" className="px-4 py-3 text-slate-700">{dur || '—'}</td>,
                      <td key="actions" className="px-4 py-3">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          Ver historial
                        </Link>
                      </td>,
                    ]}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
