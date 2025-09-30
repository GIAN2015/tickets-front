// src/app/tickets/asignar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import instance from "@/lib/api";
import { useAuthStore } from "@/components/useAuthStore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import AdminAssignPanel from "@/components/AdminAssignPanel";
import { ClipboardList, User2, Link as LinkIcon, Loader2 } from "lucide-react";

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: string;
  prioridad: string;
  assignedTo?: { id: number; username?: string; email?: string } | null;
  usuarioSolicitante?: { id: number; username?: string; email?: string } | null;
  slaTotalMinutos?: number | null;
};

export default function AsignarTicketsPage() {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const role = (useAuthStore((s) => s.user?.role) || "").toLowerCase();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Redirigir si no es admin o super-admi
  useEffect(() => {
    if (!hasHydrated) return;
    if (role !== "admin" && role !== "super-admi") {
      router.replace("/tickets");
    }
  }, [hasHydrated, role, router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await instance.get("/tickets");
      setTickets(Array.isArray(data) ? data : data?.tickets ?? []);
    } catch (e) {
      console.error(e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    fetchAll();
  }, [hasHydrated]);

  // ✅ Filtrar tickets:
  // - Que no estén completados
  // - Que NO tengan assignedTo
  // - Que NO tengan SLA definido
  const pendientes = useMemo(() => {
    const excluded = new Set(["completado"]);
    return tickets.filter(
      (t) =>
        !excluded.has((t.status || "").toLowerCase()) &&
        (!t.assignedTo || t.assignedTo === null) &&
        (!t.slaTotalMinutos || t.slaTotalMinutos === 0)
    );
  }, [tickets]);

  if (!hasHydrated || (role !== "admin" && role !== "super-admi")) {
    return (
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <div className="text-slate-600 text-sm">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-semibold text-slate-900">Asignar Tickets</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {loading ? "Cargando…" : `${pendientes.length} tickets disponibles`}
          </div>
          <Button variant="outline" onClick={fetchAll}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Refrescar
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-slate-500 text-sm">Cargando tickets…</div>
          ) : pendientes.length === 0 ? (
            <div className="p-6 text-slate-500 text-sm">
              No hay tickets pendientes para asignar.
            </div>
          ) : (
            pendientes.map((t) => (
              <div key={t.id} className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-slate-900 font-medium truncate">
                      #{t.id} — {t.title}
                    </div>
                    <div className="text-slate-500 text-sm truncate">
                      {t.description}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <User2 className="w-3.5 h-3.5" />
                        Asignado a:
                        <b className="text-slate-700 ml-1">
                          {t.assignedTo?.username || t.assignedTo?.email || "—"}
                        </b>
                      </span>
                      <span className="hidden md:inline">•</span>
                      <span className="inline-flex items-center gap-1">
                        Estado:
                        <b className="text-slate-700 ml-1">{t.status}</b>
                      </span>
                      <span className="hidden md:inline">•</span>
                      <span className="inline-flex items-center gap-1">
                        Prioridad:
                        <b className="text-slate-700 ml-1">{t.prioridad}</b>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => router.push(`/tickets/${t.id}`)}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Ver detalle
                    </Button>
                    <Button
                      onClick={() =>
                        setExpanded((cur) => (cur === t.id ? null : t.id))
                      }
                    >
                      {expanded === t.id ? "Ocultar asignación" : "Asignar / SLA"}
                    </Button>
                  </div>
                </div>

                {expanded === t.id && (
                  <div className="mt-4">
                    <AdminAssignPanel ticketId={t.id} onChanged={fetchAll} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
