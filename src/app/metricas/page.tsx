// app/metricas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import instance from "@/lib/api";
import { useAuthStore } from "@/components/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Gauge, Timer, Filter, Download, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

/* ================== Tipos ================== */
type MinimalUser = { id: number; username?: string; email?: string } | null;

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt?: string | Date;
  startedAt?: string | Date;
  prioridad: string;
  creatorId?: number;
  updatedAt?: string | Date;

  confirmadoPorUsuario?: boolean;
  fechaConfirmacion?: string | Date | null;
  rechazadoPorUsuario?: boolean;
  fechaRechazo?: string | Date | null;

  usuarioSolicitanteId?: number | null;

  archivoNombre?: string[] | null;
  adjuntoNombre?: string[] | null;
  message?: string | null;

  categoria?: string | null;
  tipo?: string | null;

  assignedToId?: number | null;
  assignedTo?: MinimalUser | undefined;
  creator?: MinimalUser | undefined;

  created_by?: string | null;
  statusAnterior?: string | null;
  empresaId?: number | null;

  slaTotalMinutos?: number | null;
  slaStartAt?: string | Date | null;
  slaGreenEndAt?: string | Date | null;
  slaYellowEndAt?: string | Date | null;
  deadlineAt?: string | Date | null;
};

/* ================== Utils ================== */
const PRIORIDAD = (p?: string) => (p ?? "media").toLowerCase();
const SLA_FALLBACK_MIN: Record<string, number> = {
  muy_alta: 120, alta: 240, media: 480, bajo: 1440, muy_bajo: 2880
};
const toMs = (d?: string | Date | null) => (d ? (d instanceof Date ? d.getTime() : new Date(d).getTime()) : NaN);
const fmtDT = (d?: string | Date | null) => (d ? new Date(d).toLocaleString("es-PE") : "—");
const msToHhMm = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const isClosed = (t: Ticket) => {
  const s = (t.status || "").toLowerCase();
  return s === "resuelto" || s === "completado";
};
const assigneeLabel = (t: Ticket) => {
  if (t.assignedTo?.username || t.assignedTo?.email) return t.assignedTo?.username || (t.assignedTo?.email as string);
  if (t.assignedToId != null) return `TI #${t.assignedToId}`;
  return "No asignado";
};
const monthKey = (d?: string | Date | null) => {
  if (!d) return "N/D";
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

/** Calcula los hitos SLA priorizando campos reales de DB. */
const computeSLAEnds = (t: Ticket) => {
  const start = !Number.isNaN(toMs(t.slaStartAt)) ? toMs(t.slaStartAt) : toMs(t.createdAt);
  const green = !Number.isNaN(toMs(t.slaGreenEndAt)) ? toMs(t.slaGreenEndAt) : NaN;
  const yellow = !Number.isNaN(toMs(t.slaYellowEndAt)) ? toMs(t.slaYellowEndAt) : NaN;
  const deadline = !Number.isNaN(toMs(t.deadlineAt)) ? toMs(t.deadlineAt) : NaN;

  if (!Number.isNaN(deadline)) return { start, green, yellow, deadline };

  const totalMin = t.slaTotalMinutos ?? null;
  if (!Number.isNaN(start) && totalMin && totalMin > 0) {
    const dl = start + totalMin * 60 * 1000;
    const g = Number.isNaN(green) ? start + Math.round(totalMin * 0.5) * 60000 : green;
    const y = Number.isNaN(yellow) ? start + Math.round(totalMin * 0.8) * 60000 : yellow;
    return { start, green: g, yellow: y, deadline: dl };
  }

  const mins = SLA_FALLBACK_MIN[PRIORIDAD(t.prioridad)] ?? SLA_FALLBACK_MIN.media;
  const s = !Number.isNaN(start) ? start : Date.now();
  const dl = s + mins * 60 * 1000;
  const g = Number.isNaN(green) ? s + Math.round(mins * 0.5) * 60000 : green;
  const y = Number.isNaN(yellow) ? s + Math.round(mins * 0.8) * 60000 : yellow;
  return { start: s, green: g, yellow: y, deadline: dl };
};

/* ================== Página ================== */
export default function MetricasPage() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtros (reactivos)
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [prio, setPrio] = useState<string>("");

  // Interacción avanzada
  const [chartMode, setChartMode] = useState<"tech" | "sla" | "trend">("tech");
  const [faseFilter, setFaseFilter] = useState<null | "verde" | "Amarillo" | "Rojo" | "Fuera SLA">(null);
  const [activeSlice, setActiveSlice] = useState<number>(0);

  useEffect(() => {
    if (!hasHydrated || role !== "admin") return; // solo admin
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data } = await instance.get("/tickets");
        const list: Ticket[] = Array.isArray(data) ? data : data?.tickets ?? [];
        setTickets(list);
      } catch (e: any) {
        setErr(e?.response?.data?.message || "No se pudieron cargar los tickets.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hasHydrated, role]);

  if (hasHydrated && role !== "admin") {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader><CardTitle className="text-amber-800">Acceso restringido</CardTitle></CardHeader>
          <CardContent className="text-amber-800">Disponible solo para administradores.</CardContent>
        </Card>
      </div>
    );
  }

  // Filtrado por rango/prioridad (por fecha de creación)
  const filtered = useMemo(() => {
    const a = new Date(from + "T00:00:00").getTime();
    const b = new Date(to + "T23:59:59").getTime();
    return tickets.filter((t) => {
      const c = toMs(t.createdAt);
      const inRange = !Number.isNaN(c) ? c >= a && c <= b : true;
      const prOk = prio ? PRIORIDAD(t.prioridad) === prio : true;
      return inRange && prOk;
    });
  }, [tickets, from, to, prio]);

  const closed = useMemo(() => filtered.filter(isClosed), [filtered]);

  // Métricas globales
  const metrics = useMemo(() => {
    const ttrs: number[] = [];
    const ttas: number[] = [];
    let inside = 0, breach = 0, greenOK = 0, yellowOK = 0;

    closed.forEach((t) => {
      const c = toMs(t.createdAt);
      const s = toMs(t.startedAt);
      const r = toMs(t.updatedAt);
      if (!Number.isNaN(c) && !Number.isNaN(r)) {
        ttrs.push(Math.max(0, r - c));
        if (!Number.isNaN(s)) ttas.push(Math.max(0, s - c));
      }
      const { green, yellow, deadline } = computeSLAEnds(t);
      if (!Number.isNaN(deadline) && !Number.isNaN(r)) {
        if (r <= deadline) inside++; else breach++;
        if (r <= green) greenOK++;
        else if (r <= yellow) yellowOK++;
      }
    });

    const total = closed.length;
    return {
      total,
      avgTTR: avg(ttrs),
      medTTR: median(ttrs),
      avgTTA: avg(ttas),
      medTTA: median(ttas),
      pctSLA: total ? Math.round(100-((inside / total) * 100)) : 0,
      inside,
      breach,
      greenOK,
      yellowOK,
      redOK: Math.max(0, inside - greenOK - yellowOK),
    };
  }, [closed]);

  // Ranking por técnico
  const byTech = useMemo(() => {
    const box: Record<string, { count: number; ttrs: number[]; ttas: number[]; inside: number; breach: number }> = {};
    closed.forEach((t) => {
      const key = assigneeLabel(t);
      if (!box[key]) box[key] = { count: 0, ttrs: [], ttas: [], inside: 0, breach: 0 };

      const c = toMs(t.createdAt);
      const s = toMs(t.startedAt);
      const r = toMs(t.updatedAt);
      if (!Number.isNaN(c) && !Number.isNaN(r)) {
        box[key].ttrs.push(Math.max(0, r - c));
        if (!Number.isNaN(s)) box[key].ttas.push(Math.max(0, s - c));
      }

      const { deadline } = computeSLAEnds(t);
      if (!Number.isNaN(deadline) && !Number.isNaN(r)) r <= deadline ? box[key].inside++ : box[key].breach++;

      box[key].count++;
    });

    const rows = Object.entries(box).map(([tech, v]) => ({
      tech,
      count: v.count,
      avgTTRh: Number((avg(v.ttrs) / 3600000).toFixed(2)),
      avgTTAh: Number((avg(v.ttas) / 3600000).toFixed(2)),
      pctSLA: v.count ? Math.round((v.inside / v.count) * 100) : 0,
    }));
    rows.sort((a, b) => a.pctSLA - b.pctSLA); // peor -> mejor
    return rows;
  }, [closed]);

  // Tabla de tickets cerrados (con filtro por fase desde el Donut)
  const tableRows = useMemo(() => {
    return closed
      .map((t) => {
        const c = toMs(t.createdAt);
        const s = toMs(t.startedAt);
        const r = toMs(t.updatedAt);
        const ttr = !Number.isNaN(c) && !Number.isNaN(r) ? Math.max(0, r - c) : 0;
        const tta = !Number.isNaN(c) && !Number.isNaN(s) ? Math.max(0, s - c) : 0;

        const { green, yellow, deadline } = computeSLAEnds(t);
        let fase = "N/D";
        //++++++++++++++++++++++++++++++++++++++++++++++++++
        // STRING A CAMBIAR EN Tickets evaluados (cerrados)
        //++++++++++++++++++++++++++++++++++++++++++++++++++
        if (!Number.isNaN(r) && !Number.isNaN(deadline)) {
          if (r <= green) fase = "Fuera SLA";
          else if (r <= yellow) fase = "En proceso";
          else if (r <= deadline) fase = "Por vencer";
          else fase = "Completado";
        }

        return {
          id: t.id,
          title: t.title,
          prioridad: PRIORIDAD(t.prioridad),
          tipo: t.tipo ?? "—",
          categoria: t.categoria ?? "—",
          creado: t.createdAt,
          iniciado: t.startedAt,
          cerrado: t.updatedAt,
          ttaMs: tta,
          ttrMs: ttr,
          ttaTxt: msToHhMm(tta),
          ttrTxt: msToHhMm(ttr),
          fase,
          tecnico: assigneeLabel(t),
          month: monthKey(t.updatedAt),
        };
      })
      .filter((r) => (faseFilter ? r.fase === faseFilter : true))
      .sort((a, b) => toMs(b.cerrado) - toMs(a.cerrado));
  }, [closed, faseFilter]);

  // Tendencia mensual (mediana TTR en horas)
  const trendData = useMemo(() => {
    const box: Record<string, number[]> = {};
    tableRows.forEach((r) => {
      if (r.month === "N/D") return;
      if (!box[r.month]) box[r.month] = [];
      box[r.month].push(r.ttrMs);
    });
    const rows = Object.entries(box).map(([month, arr]) => ({
      month,
      medTTRh: Number((median(arr) / 3600000).toFixed(2)),
      count: arr.length,
    }));
    rows.sort((a, b) => (a.month < b.month ? -1 : 1));
    return rows;
  }, [tableRows]);

  /* ================== Exportar a Excel (xlsx) ================== */
  const exportXLSX = () => {
    // --- Hoja Resumen ---
    const resumenAOA = [
      ["Métrica", "Valor"],
      ["Tickets evaluados", metrics.total],
      ["TTR promedio (hh:mm)", msToHhMm(metrics.avgTTR)],
      ["TTR mediana (hh:mm)", msToHhMm(metrics.medTTR)],
      ["TTA promedio (hh:mm)", msToHhMm(metrics.avgTTA)],
      ["TTA mediana (hh:mm)", msToHhMm(metrics.medTTA)],
      ["% Cumplimiento SLA", `${metrics.pctSLA}%`],
      ["Dentro de SLA (total)", metrics.inside],
      ["Fuera de SLA (total)", metrics.breach],
      ["Verde (≤ greenEnd)", metrics.greenOK],
      ["Amarillo (≤ yellowEnd)", metrics.yellowOK],
      ["Rojo (≤ deadline)", metrics.redOK],
      ["Rango", `${from} a ${to}`],
      ["Prioridad filtrada", prio || "Todas"],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenAOA);

    // --- Hoja Por técnico ---
    const wsTech = XLSX.utils.json_to_sheet(
      byTech.map((r) => ({
        Técnico: r.tech,
        "Tickets cerrados": r.count,
        "TTR medio (h)": r.avgTTRh,
        "TTA medio (h)": r.avgTTAh,
        "% SLA": r.pctSLA,
      }))
    );

    // --- Hoja Tickets cerrados ---
    const wsTickets = XLSX.utils.json_to_sheet(
      tableRows.map((r) => ({
        ID: r.id,
        Título: r.title,
        Prioridad: r.prioridad,
        Tipo: r.tipo,
        Categoría: r.categoria,
        Creado: fmtDT(r.creado),
        Iniciado: fmtDT(r.iniciado),
        Cerrado: fmtDT(r.cerrado),
        "TTA (texto)": r.ttaTxt,
        "TTR (texto)": r.ttrTxt,
        "Fase SLA": r.fase,
        Técnico: r.tecnico,
        Mes: r.month,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsTech, "Por técnico");
    XLSX.utils.book_append_sheet(wb, wsTickets, "Tickets cerrados");

    XLSX.writeFile(wb, `metricas_sla_${from}_a_${to}.xlsx`, { compression: true, bookType: "xlsx" });
  };

  /* ================== Preparación de datasets de gráficos ================== */
  const slaPie = useMemo(
    () => [
      { name: "Fuera SLA", value: metrics.greenOK, color: "#636363ff" },   // emerald-500
      { name: "En proceso", value: metrics.yellowOK, color: "#f59e0b" }, // amber-500
      { name: "Por vencer", value: metrics.redOK, color: "#ef4444" },        // red-500
      { name: "Completado", value: metrics.breach, color: "#10b981" },  // slate-400
    ],
    [metrics.greenOK, metrics.yellowOK, metrics.redOK, metrics.breach]
  );

  /* ================== UI ================== */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Métricas SLA</h1>
          <p className="text-sm text-slate-600 mt-1">
            Cumplimiento, tiempos y distribución por fases (verde/amarillo/rojo).
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <Button variant="outline" onClick={exportXLSX} className="inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Error */}
      {err && <div className="border border-rose-200 p-4 rounded-lg bg-rose-50 text-rose-700">{err}</div>}

      {/* Filtros (reactivos, sin botón aplicar) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Filter className="w-4 h-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm
                         focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm
                         focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Prioridad</label>
            <select
              value={prio}
              onChange={(e) => setPrio(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm
                         focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            >
              <option value="">Todas</option>
              <option value="muy_alta">Muy alta</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="bajo">Baja</option>
              <option value="muy_bajo">Muy baja</option>
            </select>
          </div>

          {/* Chips de filtro de fase (desde el donut) */}
          <div className="flex items-end gap-2">
            {faseFilter ? (
              <button
                onClick={() => setFaseFilter(null)}
                className="h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                title="Limpiar filtro de fase"
              >
                Quitar filtro: <span className="font-medium">{faseFilter}</span>
              </button>
            ) : (
              <div className="h-10 inline-flex items-center gap-2 text-slate-500">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">Tip: haz clic en el donut</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas resumen */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Tickets evaluados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">
            {loading ? "…" : metrics.total}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Timer className="w-4 h-4" /> TTR promedio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-slate-900">
            {loading ? "…" : msToHhMm(metrics.avgTTR)}
            <div className="text-xs text-slate-500">Mediana: {loading ? "…" : msToHhMm(metrics.medTTR)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Timer className="w-4 h-4" /> TTA promedio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-slate-900">
            {loading ? "…" : msToHhMm(metrics.avgTTA)}
            <div className="text-xs text-slate-500">Mediana: {loading ? "…" : msToHhMm(metrics.medTTA)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Gauge className="w-4 h-4" /> Cumplimiento SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-emerald-700">
              {loading ? "…" : `${metrics.pctSLA}%`}
            </div>
            <div className="text-xs text-slate-500">
                {/* complemento de las metricas corregir */}
              Dentro: {metrics.total - metrics.inside} / {metrics.total}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de gráficos */}
      <div className="flex items-center gap-2">
        {[
          { key: "tech", label: "Por técnico (barras)" },
          { key: "sla", label: "Fases SLA (donut)" },
          { key: "trend", label: "Tendencia mensual" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setChartMode(t.key as typeof chartMode)}
            className={[
              "h-9 px-3 rounded-lg text-sm border",
              chartMode === t.key
                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TECH: Barras con gradientes y dos ejes */}
      {chartMode === "tech" && (
        <Card>
          <CardHeader><CardTitle className="text-slate-800">Desempeño por técnico TI</CardTitle></CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <div className="animate-pulse h-full w-full bg-slate-100 rounded-md" />
            ) : byTech.length === 0 ? (
              <div className="text-sm text-slate-500">No hay datos (tickets cerrados).</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTech} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tech" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgTTRh" name="TTR medio (h)" fill="url(#gradCyan)" radius={[6,6,0,0]} />
                  <Bar yAxisId="left" dataKey="avgTTAh" name="TTA medio (h)" fill="url(#gradViolet)" radius={[6,6,0,0]} />
                  <Bar yAxisId="right" dataKey="pctSLA" name="% SLA" fill="url(#gradGreen)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* SLA: Donut interactivo (clic filtra tabla) */}
      {chartMode === "sla" && (
        <Card>
          <CardHeader><CardTitle className="text-slate-800">Distribución por fases SLA</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={slaPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  onMouseEnter={(_, idx) => setActiveSlice(idx)}
                  onClick={(_, idx) => {
                    const fase = slaPie[idx]?.name as typeof faseFilter;
                    setFaseFilter((prev) => (prev === fase ? null : fase));
                  }}
                >
                  {slaPie.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.color}
                      opacity={activeSlice === idx ? 1 : 0.8}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-slate-500">
              Clic en un segmento para filtrar la tabla por fase. Vuelve a hacer clic para quitar el filtro.
            </div>
          </CardContent>
        </Card>
      )}

      {/* TREND: Tendencia mensual (mediana TTR en horas) */}
      {chartMode === "trend" && (
        <Card>
          <CardHeader><CardTitle className="text-slate-800">Tendencia mensual (mediana de TTR en horas)</CardTitle></CardHeader>
          <CardContent className="h-80">
            {trendData.length === 0 ? (
              <div className="text-sm text-slate-500">Sin datos suficientes para la tendencia.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="medTTRh" name="Mediana TTR (h)" stroke="#0ea5e9" fill="url(#gradSky)" />
                  <Line type="monotone" dataKey="medTTRh" stroke="#0369a1" dot />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de tickets cerrados */}
      <Card>
        <CardHeader><CardTitle className="text-slate-800">Tickets evaluados (cerrados)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Título</th>
                <th className="py-2 pr-4">Prioridad</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Categoría</th>
                <th className="py-2 pr-4">Creado</th>
                <th className="py-2 pr-4">Iniciado</th>
                <th className="py-2 pr-4">Cerrado</th>
                <th className="py-2 pr-4">TTA</th>
                <th className="py-2 pr-4">TTR</th>
                <th className="py-2 pr-4">Fase SLA</th>
                <th className="py-2 pr-4">Técnico</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="py-3 text-slate-500">Cargando…</td></tr>
              ) : tableRows.length === 0 ? (
                <tr><td colSpan={12} className="py-3 text-slate-500">No hay tickets cerrados en el rango.</td></tr>
              ) : (
                tableRows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                    <td className="py-2 pr-4">
                      <a href={`/tickets/${r.id}`} className="text-sky-700 hover:underline">#{r.id}</a>
                    </td>
                    <td className="py-2 pr-4">{r.title}</td>
                    <td className="py-2 pr-4 capitalize">{r.prioridad}</td>
                    <td className="py-2 pr-4">{r.tipo}</td>
                    <td className="py-2 pr-4">{r.categoria}</td>
                    <td className="py-2 pr-4">{fmtDT(r.creado)}</td>
                    <td className="py-2 pr-4">{fmtDT(r.iniciado)}</td>
                    <td className="py-2 pr-4">{fmtDT(r.cerrado)}</td>
                    <td className="py-2 pr-4">{r.ttaTxt}</td>
                    <td className="py-2 pr-4">{r.ttrTxt}</td>
                    <td
                      className={`py-2 pr-4 ${
                        r.fase === "Fuera SLA" ? "text-rose-700" :
                        r.fase === "Rojo" ? "text-rose-600" :
                        r.fase === "Amarillo" ? "text-amber-600" : "text-emerald-700"
                      }`}
                    >
                      {r.fase}
                    </td>
                    <td className="py-2 pr-4">{r.tecnico}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && (
            <div className="mt-3 text-xs text-slate-500">
              <b>TTA</b>: <code>startedAt - createdAt</code>. <b>TTR</b>: <code>updatedAt - createdAt</code>.
              Fases SLA calculadas con <code>slaGreenEndAt</code>, <code>slaYellowEndAt</code> y <code>deadlineAt</code>;
              si faltan, se estima con <code>slaStartAt + slaTotalMinutos</code> o por prioridad.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
