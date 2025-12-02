// app/metricas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import instance from "@/lib/api";
import { useAuthStore } from "@/components/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Gauge,
  Timer,
  Filter,
  Download,
  Sparkles,
  TrendingUp,
  Layers,
} from "lucide-react";
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

  archivoNombre?: string | string[] | null;
  adjuntoNombre?: string | string[] | null;
  message?: string | null;

  categoria?: string | null;
  tipo?: string | null;

  assignedToId?: number | null;
  assignedTo?: MinimalUser | undefined;
  creator?: MinimalUser | undefined;

  created_by?: number | null;
  statusAnterior?: string | null;
  empresaId?: number | null;

  slaTotalMinutos?: number | null;
  slaStartAt?: string | Date | null;
  slaGreenEndAt?: string | Date | null;
  slaYellowEndAt?: string | Date | null;
  deadlineAt?: string | Date | null;
};

type ClosedPhase = "Cierre holgado" | "Cierre oportuno" | "Cierre al límite" | "Fuera SLA";
type BacklogPhase = "En proceso" | "Por vencer" | "Fuera SLA";

type TechRow = {
  tech: string;
  count: number;
  avgTTRh: number;
  p90TTRh: number;
  avgTTAh: number;
  pctSLA: number;
  breaches: number;
};

type SLAPieRow = { name: ClosedPhase; value: number; color: string };
type BacklogPieRow = { name: BacklogPhase; value: number; color: string };

/* ================== Utils ================== */
const PRIORIDAD = (p?: string) => (p ?? "media").toLowerCase();
const SLA_FALLBACK_MIN: Record<string, number> = {
  muy_alta: 120,
  alta: 240,
  media: 480,
  bajo: 1440,
  muy_bajo: 2880,
};
const toMs = (d?: string | Date | null) =>
  d ? (d instanceof Date ? d.getTime() : new Date(d).getTime()) : NaN;
const fmtDT = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString("es-PE") : "—";
const msToHhMm = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};
const hours = (ms: number) => Number((ms / 3600000).toFixed(2));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
};
const isClosed = (t: Ticket) => {
  const s = (t.status || "").toLowerCase();
  return s === "resuelto" || s === "completado";
};
const assigneeLabel = (t: Ticket) => {
  if (t.assignedTo?.username || t.assignedTo?.email)
    return t.assignedTo?.username || (t.assignedTo?.email as string);
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
/** Normaliza variaciones de estados emisor (en proceso/en progreso, etc.) */
const normalizeStatus = (s?: string) => {
  const k = (s || "").trim().toLowerCase();
  if (!k) return "no iniciado";
  if (["en progreso", "en proceso"].includes(k)) return "en proceso";
  return k;
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

  // Interacción
  const [chartMode, setChartMode] = useState<"tech" | "sla" | "trend" | "prio" | "cats" | "backlog">("tech");
  const [faseFilter, setFaseFilter] = useState<ClosedPhase | null>(null);
  const [activeSlice, setActiveSlice] = useState<number>(0);

  useEffect(() => {
    if (!hasHydrated || role !== "admin") return; // solo admin
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data } = await instance.get("/tickets");
        const list: Ticket[] = Array.isArray(data) ? data : data?.tickets ?? [];
        // normaliza estados ruidosos
        list.forEach((t) => (t.status = normalizeStatus(t.status)));
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
          <CardHeader>
            <CardTitle className="text-amber-800">Acceso restringido</CardTitle>
          </CardHeader>
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
  const open = useMemo(() => filtered.filter((t) => !isClosed(t)), [filtered]);

  /* ================== Métricas globales ================== */
  const metrics = useMemo(() => {
    const ttrs: number[] = [];
    const ttas: number[] = [];
    let inside = 0,
      breach = 0,
      greenOK = 0,
      yellowOK = 0;

    closed.forEach((t) => {
      const c = toMs(t.createdAt);
      const s = toMs(t.startedAt);
      const r = toMs(t.updatedAt);
      if (!Number.isNaN(c) && !Number.isNaN(r)) {
        ttrs.push(Math.max(0, r - c)); // lead time
        if (!Number.isNaN(s)) ttas.push(Math.max(0, s - c)); // first response
      }
      const { green, yellow, deadline } = computeSLAEnds(t);
      if (!Number.isNaN(deadline) && !Number.isNaN(r)) {
        if (r <= deadline) inside++;
        else breach++;
        if (r <= green) greenOK++;
        else if (r <= yellow) yellowOK++;
      }
    });

    const total = closed.length;
    const p50 = quantile(ttrs, 0.5);
    const p90 = quantile(ttrs, 0.9);

    // CSAT proxy
    let confirmados = 0,
      rechazados = 0;
    closed.forEach((t) => {
      if (t.confirmadoPorUsuario) confirmados++;
      if (t.rechazadoPorUsuario) rechazados++;
    });
    const csatDen = confirmados + rechazados || total;
    const csat = csatDen ? Math.round((confirmados / csatDen) * 100) : 0;

    return {
      total,
      openCount: open.length,
      avgTTR: avg(ttrs),
      medTTR: p50,
      p90TTR: p90,
      avgTTA: avg(ttas),
      medTTA: quantile(ttas, 0.5),
      pctSLA: total ? Math.round((inside / total) * 100) : 0,
      inside,
      breach,
      greenOK,
      yellowOK,
      redOK: Math.max(0, inside - greenOK - yellowOK),
      csat,
      confirmados,
      rechazados,
    };
  }, [closed, open.length]);

  /* ================== Backlog: edad y riesgo ================== */
  const nowMs = Date.now();
  const backlogRows = useMemo(() => {
    return open.map((t) => {
      const ageMs = Math.max(0, nowMs - (toMs(t.createdAt) || nowMs));
      const { green, yellow, deadline } = computeSLAEnds(t);
      let fase: BacklogPhase | "N/D" = "N/D";
      if (!Number.isNaN(deadline)) {
        if (nowMs <= green) fase = "En proceso";
        else if (nowMs <= yellow) fase = "En proceso";
        else if (nowMs <= deadline) fase = "Por vencer";
        else fase = "Fuera SLA";
      }
      return {
        id: t.id,
        title: t.title,
        prioridad: PRIORIDAD(t.prioridad),
        estado: normalizeStatus(t.status),
        creado: t.createdAt,
        asignadoA: assigneeLabel(t),
        edadMs: ageMs,
        edadTxt: msToHhMm(ageMs),
        fase,
        categoria: t.categoria ?? "—",
        tipo: t.tipo ?? "—",
      };
    });
  }, [open, nowMs]);

  const backlogDonut: BacklogPieRow[] = useMemo(() => {
    const counts: Record<BacklogPhase, number> = { "En proceso": 0, "Por vencer": 0, "Fuera SLA": 0 };
    backlogRows.forEach((r) => {
      if (r.fase === "En proceso" || r.fase === "Por vencer" || r.fase === "Fuera SLA") {
        counts[r.fase]++;
      }
    });
    return [
      { name: "En proceso", value: counts["En proceso"], color: "#f59e0b" },
      { name: "Por vencer", value: counts["Por vencer"], color: "#ef4444" },
      { name: "Fuera SLA", value: counts["Fuera SLA"], color: "#94a3b8" },
    ];
  }, [backlogRows]);

  /* ================== Ranking por técnico ================== */
  const byTech: TechRow[] = useMemo(() => {
    const box: Record<
      string,
      { count: number; ttrs: number[]; ttas: number[]; inside: number; breach: number }
    > = {};
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

    const rows: TechRow[] = Object.entries(box).map(([tech, v]) => ({
      tech,
      count: v.count,
      avgTTRh: Number((avg(v.ttrs) / 3600000).toFixed(2)),
      p90TTRh: Number((quantile(v.ttrs, 0.9) / 3600000).toFixed(2)),
      avgTTAh: Number((avg(v.ttas) / 3600000).toFixed(2)),
      pctSLA: v.count ? Math.round((v.inside / v.count) * 100) : 0,
      breaches: v.breach,
    }));

    // Ordena por peor desempeño: más brechas, menor % SLA, mayor p90 TTR
    rows.sort((a, b) => b.breaches - a.breaches || a.pctSLA - b.pctSLA || b.p90TTRh - a.p90TTRh);
    return rows;
  }, [closed]);

  /* ================== Cumplimiento por prioridad ================== */
  const slaByPriority = useMemo(() => {
    const box: Record<
      string,
      { total: number; inside: number; breach: number; ttrs: number[] }
    > = {};
    closed.forEach((t) => {
      const p = PRIORIDAD(t.prioridad);
      if (!box[p]) box[p] = { total: 0, inside: 0, breach: 0, ttrs: [] };
      box[p].total++;
      const { deadline } = computeSLAEnds(t);
      const r = toMs(t.updatedAt);
      if (!Number.isNaN(deadline) && !Number.isNaN(r)) {
        if (r <= deadline) box[p].inside++;
        else box[p].breach++;
      }
      const c = toMs(t.createdAt);
      if (!Number.isNaN(c) && !Number.isNaN(r)) box[p].ttrs.push(Math.max(0, r - c));
    });
    const prios = ["muy_alta", "alta", "media", "bajo", "muy_bajo"];
    return prios
      .filter((p) => box[p])
      .map((p) => ({
        prioridad: p.replace("_", " "),
        "% SLA": box[p].total ? Math.round((box[p].inside / box[p].total) * 100) : 0,
        Brechas: box[p].breach,
        "TTR p90 (h)": hours(quantile(box[p].ttrs, 0.9)),
      }));
  }, [closed]);

  /* ================== Top categorías por TTR ================== */
  const topCats = useMemo(() => {
    const box: Record<string, number[]> = {};
    closed.forEach((t) => {
      const cat = (t.categoria || "OTROS").toString();
      const c = toMs(t.createdAt);
      const r = toMs(t.updatedAt);
      if (!Number.isNaN(c) && !Number.isNaN(r)) {
        if (!box[cat]) box[cat] = [];
        box[cat].push(Math.max(0, r - c));
      }
    });
    const rows = Object.entries(box).map(([categoria, arr]) => ({
      categoria,
      "TTR medio (h)": hours(avg(arr)),
      "TTR p90 (h)": hours(quantile(arr, 0.9)),
      tickets: arr.length,
    }));
    rows.sort((a, b) => b["TTR p90 (h)"] - a["TTR p90 (h)"]);
    return rows.slice(0, 10);
  }, [closed]);

  /* ================== Tendencia: entrada vs cierre ================== */
  const trendData = useMemo(() => {
    const byMonth: Record<string, { created: number; closed: number }> = {};
    filtered.forEach((t) => {
      const kC = monthKey(t.createdAt);
      if (!byMonth[kC]) byMonth[kC] = { created: 0, closed: 0 };
      byMonth[kC].created++;

      if (isClosed(t)) {
        const kR = monthKey(t.updatedAt);
        if (!byMonth[kR]) byMonth[kR] = { created: 0, closed: 0 };
        byMonth[kR].closed++;
      }
    });
    const rows = Object.entries(byMonth)
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));
    return rows;
  }, [filtered]);

  /* ================== Donut de fases (cerrados) ================== */
  const slaPie: SLAPieRow[] = useMemo(
    () => [
      { name: "Cierre holgado", value: metrics.greenOK, color: "#10b981" },   // r <= green
      { name: "Cierre oportuno", value: metrics.yellowOK, color: "#f59e0b" }, // r <= yellow
      { name: "Cierre al límite", value: metrics.redOK, color: "#ef4444" },   // r <= deadline
      { name: "Fuera SLA", value: metrics.breach, color: "#94a3b8" },         // r > deadline
    ],
    [metrics.greenOK, metrics.yellowOK, metrics.redOK, metrics.breach]
  );

  /* ================== Exportar a Excel (xlsx) ================== */
  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();

    // Resumen
    const resumenAOA = [
      ["Métrica", "Valor"],
      ["Tickets evaluados (cerrados)", metrics.total],
      ["Backlog abierto", metrics.openCount],
      ["Cumplimiento SLA (%)", `${metrics.pctSLA}%`],
      ["Dentro de SLA (total)", metrics.inside],
      ["Fuera de SLA (total)", metrics.breach],
      ["TTR promedio (hh:mm)", msToHhMm(metrics.avgTTR)],
      ["TTR mediana (hh:mm)", msToHhMm(metrics.medTTR)],
      ["TTR p90 (hh:mm)", msToHhMm(metrics.p90TTR)],
      ["TTA promedio (hh:mm)", msToHhMm(metrics.avgTTA)],
      ["TTA mediana (hh:mm)", msToHhMm(metrics.medTTA)],
      ["CSAT (proxy por confirmación)", `${metrics.csat}%`],
      ["Confirmados", metrics.confirmados],
      ["Rechazados", metrics.rechazados],
      ["Rango", `${from} a ${to}`],
      ["Prioridad filtrada", prio || "Todas"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenAOA), "Resumen");

    // Por técnico
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        byTech.map((r) => ({
          Técnico: r.tech,
          "Tickets cerrados": r.count,
          "TTR medio (h)": r.avgTTRh,
          "TTR p90 (h)": r.p90TTRh,
          "TTA medio (h)": r.avgTTAh,
          "% SLA": r.pctSLA,
          "Brechas SLA": r.breaches,
        }))
      ),
      "Por técnico"
    );

    // Cumplimiento por prioridad
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(slaByPriority),
      "SLA por prioridad"
    );

    // Top categorías
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(topCats),
      "Top categorías"
    );

    // Backlog abierto
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        backlogRows.map((r) => ({
          ID: r.id,
          Título: r.title,
          Prioridad: r.prioridad,
          Estado: r.estado,
          Creado: fmtDT(r.creado),
          "Edad (texto)": r.edadTxt,
          "Fase estimada": r.fase,
          Categoría: r.categoria,
          Tipo: r.tipo,
          Asignado: r.asignadoA,
        }))
      ),
      "Backlog abierto"
    );

    // Tickets cerrados (detalle)
    const closedRows = closed
      .map((t) => {
        const c = toMs(t.createdAt);
        const s = toMs(t.startedAt);
        const r = toMs(t.updatedAt);
        const ttr = !Number.isNaN(c) && !Number.isNaN(r) ? Math.max(0, r - c) : 0;
        const tta = !Number.isNaN(c) && !Number.isNaN(s) ? Math.max(0, s - c) : 0;

        const { green, yellow, deadline } = computeSLAEnds(t);
        let resultado: ClosedPhase | "N/D" = "N/D";
        if (!Number.isNaN(r) && !Number.isNaN(deadline)) {
          if (r <= green) resultado = "Cierre holgado";
          else if (r <= yellow) resultado = "Cierre oportuno";
          else if (r <= deadline) resultado = "Cierre al límite";
          else resultado = "Fuera SLA";
        }

        return {
          ID: t.id,
          Título: t.title,
          Prioridad: PRIORIDAD(t.prioridad),
          Tipo: t.tipo ?? "—",
          Categoría: t.categoria ?? "—",
          Creado: fmtDT(t.createdAt),
          Iniciado: fmtDT(t.startedAt),
          Cerrado: fmtDT(t.updatedAt),
          "TTA (texto)": msToHhMm(tta),
          "TTR (texto)": msToHhMm(ttr),
          "Resultado SLA al cierre": resultado,
          Técnico: assigneeLabel(t),
          "Confirmado por usuario": !!t.confirmadoPorUsuario,
          "Rechazado por usuario": !!t.rechazadoPorUsuario,
          Mes: monthKey(t.updatedAt),
        };
      })
      .sort((a, b) => (a.Cerrado < b.Cerrado ? 1 : -1));

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(closedRows),
      "Tickets cerrados"
    );

    XLSX.writeFile(wb, `metricas_sla_${from}_a_${to}.xlsx`, {
      compression: true,
      bookType: "xlsx",
    });
  };

  /* ================== UI ================== */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Métricas SLA</h1>
          <p className="text-sm text-slate-600 mt-1">
            <b>Cerrados:</b> Cierre holgado / oportuno / al límite / fuera SLA.{" "}
            <b>Backlog:</b> En proceso / Por vencer / Fuera SLA.
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <Button variant="outline" onClick={exportXLSX} className="inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="border border-rose-200 p-4 rounded-lg bg-rose-50 text-rose-700">
          {err}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Filter className="w-4 h-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Prioridad</label>
            <select
              value={prio}
              onChange={(e) => setPrio(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-sky-500"
            >
              <option value="">Todas</option>
              <option value="muy_alta">Muy alta</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="bajo">Baja</option>
              <option value="muy_bajo">Muy baja</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
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
                <span className="text-sm">Tip: usa los donuts para filtrar y comparar.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs clave */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Tickets (cerrados)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">
            {loading ? "…" : metrics.total}
            <div className="text-xs text-slate-500 mt-1">Backlog abierto: {metrics.openCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Timer className="w-4 h-4" /> TTR
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base font-semibold text-slate-900">
            Prom: {loading ? "…" : msToHhMm(metrics.avgTTR)}
            <div className="text-xs text-slate-500">p50: {loading ? "…" : msToHhMm(metrics.medTTR)}</div>
            <div className="text-xs text-slate-500">p90: {loading ? "…" : msToHhMm(metrics.p90TTR)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Timer className="w-4 h-4" /> TTA
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base font-semibold text-slate-900">
            Prom: {loading ? "…" : msToHhMm(metrics.avgTTA)}
            <div className="text-xs text-slate-500">p50: {loading ? "…" : msToHhMm(metrics.medTTA)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Gauge className="w-4 h-4" /> Cumplimiento SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-emerald-700">
              {loading ? "…" : `${metrics.pctSLA}%`}
            </div>
            <div className="text-xs text-slate-500">Dentro: {metrics.inside} / Fuera: {metrics.breach}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Layers className="w-4 h-4" /> CSAT (proxy)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {loading ? "…" : `${metrics.csat}%`}
            </div>
            <div className="text-xs text-slate-500">
              Conf.: {metrics.confirmados} &nbsp;·&nbsp; Rech.: {metrics.rechazados}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de gráficos */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "tech", label: "Por técnico (barras)" },
          { key: "sla", label: "Fases cerrados (donut)" },
          { key: "backlog", label: "Backlog y riesgo (donut)" },
          { key: "trend", label: "Entrada vs cierre" },
          { key: "prio", label: "SLA por prioridad" },
          { key: "cats", label: "Top categorías por TTR" },
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

      {/* TECH: Barras */}
      {chartMode === "tech" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Desempeño por técnico TI</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <div className="animate-pulse h-full w-full bg-slate-100 rounded-md" />
            ) : byTech.length === 0 ? (
              <div className="text-sm text-slate-500">No hay datos (tickets cerrados).</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTech} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
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
                  <Bar yAxisId="left" dataKey="avgTTRh" name="TTR medio (h)" fill="url(#gCyan)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="left" dataKey="p90TTRh" name="TTR p90 (h)" fill="url(#gViolet)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="pctSLA" name="% SLA" fill="url(#gGreen)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* SLA (cerrados): Donut */}
      {chartMode === "sla" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Distribución por fases (tickets cerrados)</CardTitle>
          </CardHeader>
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
                    const fase = slaPie[idx]?.name; // ClosedPhase
                    setFaseFilter((prev) => (prev === fase ? null : fase));
                  }}
                >
                  {slaPie.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.color}
                      opacity={activeSlice === idx ? 1 : 0.85}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-slate-500">
              Clic para filtrar la tabla de abajo por fase. Clic de nuevo para limpiar.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backlog vivo y riesgo */}
      {chartMode === "backlog" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Backlog abierto — Riesgo de SLA</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={backlogDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                  >
                    {backlogDonut.map((entry, idx) => (
                      <Cell key={`bcell-${idx}`} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-slate-500 mt-2">
                Estado actual del backlog (estimado según hitos SLA).
              </div>
            </div>
            <div className="rounded-lg border p-3 text-sm text-slate-700 bg-slate-50">
              <div className="font-medium mb-1">Notas accionables</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Prioriza <b>“Por vencer”</b> (último tramo antes del deadline) y luego <b>“Fuera SLA”</b>.
                </li>
                <li>
                  Revisa asignaciones <b>“No asignado”</b> — suelen explicar cuellos de botella.
                </li>
                <li>
                  Si el backlog crece más rápido que el cierre (ver “Entrada vs cierre”), sube capacidad o reduce WIP.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entrada vs cierre */}
      {chartMode === "trend" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Entrada vs cierre (por mes)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {topCats.length === 0 ? ( // si no hay cerrados suele faltar data de tendencia útil
              <div className="text-sm text-slate-500">Sin datos suficientes para la tendencia.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" name="Creados" stroke="#0ea5e9" dot />
                  <Line type="monotone" dataKey="closed" name="Cerrados" stroke="#22c55e" dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* SLA por prioridad */}
      {chartMode === "prio" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Cumplimiento por prioridad</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {slaByPriority.length === 0 ? (
              <div className="text-sm text-slate-500">No hay datos para prioridades.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="prioridad" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="% SLA" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Brechas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="TTR p90 (h)" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top categorías por TTR */}
      {chartMode === "cats" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Top categorías por TTR (p90)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {topCats.length === 0 ? (
              <div className="text-sm text-slate-500">No hay datos para categorías.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="TTR p90 (h)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="TTR medio (h)" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de tickets cerrados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Tickets evaluados (cerrados)</CardTitle>
        </CardHeader>
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
                <th className="py-2 pr-4">Resultado SLA al cierre</th>
                <th className="py-2 pr-4">Técnico</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-3 text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : (
                closed
                  .map((t) => {
                    const c = toMs(t.createdAt);
                    const s = toMs(t.startedAt);
                    const r = toMs(t.updatedAt);
                    const ttr = !Number.isNaN(c) && !Number.isNaN(r) ? Math.max(0, r - c) : 0;
                    const tta = !Number.isNaN(c) && !Number.isNaN(s) ? Math.max(0, s - c) : 0;

                    const { green, yellow, deadline } = computeSLAEnds(t);
                    let resultado: ClosedPhase | "N/D" = "N/D";
                    if (!Number.isNaN(r) && !Number.isNaN(deadline)) {
                      if (r <= green) resultado = "Cierre holgado";
                      else if (r <= yellow) resultado = "Cierre oportuno";
                      else if (r <= deadline) resultado = "Cierre al límite";
                      else resultado = "Fuera SLA";
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
                      ttaTxt: msToHhMm(tta),
                      ttrTxt: msToHhMm(ttr),
                      resultado,
                      tecnico: assigneeLabel(t),
                    };
                  })
                  .filter((r) => (faseFilter ? r.resultado === faseFilter : true))
                  .sort((a, b) => toMs(b.cerrado) - toMs(a.cerrado))
                  .map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                      <td className="py-2 pr-4">
                        <a href={`/tickets/${r.id}`} className="text-sky-700 hover:underline">
                          #{r.id}
                        </a>
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
                          r.resultado === "Fuera SLA"
                            ? "text-rose-700"
                            : r.resultado === "Cierre al límite"
                            ? "text-rose-600"
                            : r.resultado === "Cierre oportuno"
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {r.resultado}
                      </td>
                      <td className="py-2 pr-4">{r.tecnico}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
          {!loading && (
            <div className="mt-3 text-xs text-slate-500">
              <b>TTA</b>: <code>startedAt - createdAt</code>. <b>TTR</b>: <code>updatedAt - createdAt</code>.{" "}
              <b>Resultado SLA al cierre</b> calculado con <code>slaGreenEndAt</code>, <code>slaYellowEndAt</code> y{" "}
              <code>deadlineAt</code>; si faltan, se estima con <code>slaStartAt + slaTotalMinutos</code> o por prioridad.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
