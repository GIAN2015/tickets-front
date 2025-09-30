"use client";
import { useEffect, useMemo, useState } from "react";
import instance from "@/lib/api";
import { Button } from "@/components/ui/button";

type MinimalUser = { id: number; username?: string; email?: string; role?: string };
type Ticket = { id: number; assignedTo?: MinimalUser | null };

export default function AdminAssignPanel({
  ticketId,
  onChanged,
}: { ticketId: number; onChanged?: () => void }) {
  const [tis, setTis] = useState<MinimalUser[]>([]);
  const [selectedTi, setSelectedTi] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  // --- SLA UI ---
  const [setSlaEnabled, setSetSlaEnabled] = useState(false);
  const [dias, setDias] = useState<number>(0);
  const [horas, setHoras] = useState<number>(0);
  const [minutos, setMinutos] = useState<number>(0);
  const [greenPct, setGreenPct] = useState<number>(40);
  const [yellowPct, setYellowPct] = useState<number>(40);
  const redPct = useMemo(() => Math.max(0, 100 - greenPct - yellowPct), [greenPct, yellowPct]);

  const yaAsignado = !!ticket?.assignedTo?.id;

  useEffect(() => {
    (async () => {
      try {
        const [tiRes, tkRes] = await Promise.all([
          instance.get("/users/by-empresa?role=ti"),
          instance.get(`/tickets/${ticketId}`),
        ]);

        const raw = (Array.isArray(tiRes.data) ? tiRes.data : tiRes.data?.users) ?? [];
        const onlyTi: MinimalUser[] = raw.filter(
          (u: any) => (u.role ?? "").toString().toLowerCase() === "ti"
        );
        setTis(onlyTi);

        setTicket(tkRes.data);
        if (tkRes.data?.assignedTo?.id) {
          setSelectedTi(tkRes.data.assignedTo.id);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [ticketId]);

  const totalMinutos = useMemo(() => {
    const d = Math.max(0, dias | 0);
    const h = Math.max(0, Math.min(23, horas | 0));
    const m = Math.max(0, Math.min(59, minutos | 0));
    return d * 24 * 60 + h * 60 + m;
  }, [dias, horas, minutos]);

  const asignar = async () => {
    if (!selectedTi) return alert("Selecciona un TI");
    if (setSlaEnabled && totalMinutos <= 0) {
      return alert("Para configurar el SLA, el tiempo total debe ser mayor a 0.");
    }
    if (setSlaEnabled && greenPct + yellowPct > 100) {
      return alert("La suma de Verde + Amarillo no puede superar 100%.");
    }

    setLoading(true);
    try {
      // 1) Asignar TI
      await instance.patch(`/tickets/${ticketId}/asignar`, { userId: selectedTi });

      // 2) Configurar SLA (opcional)
      if (setSlaEnabled) {
        await instance.patch(`/tickets/${ticketId}/sla`, {
          totalMinutos,                               // backend ya acepta totalMinutos
          greenPct: Math.min(1, Math.max(0, greenPct / 100)),
          yellowPct: Math.min(1, Math.max(0, yellowPct / 100)),
          // redPct opcional (el backend normaliza)
        });
      }

      const { data } = await instance.get(`/tickets/${ticketId}`);
      setTicket(data);
      if (data?.assignedTo?.id) setSelectedTi(data.assignedTo.id);

      onChanged?.();
      alert(setSlaEnabled ? "✅ TI asignado y SLA configurado" : "✅ TI asignado correctamente");
    } catch (e: any) {
      console.error(e?.response?.data || e);
      alert(e?.response?.data?.message || "No se pudo completar la acción");
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (label: "8h" | "24h" | "3d" | "5d") => {
    switch (label) {
      case "8h":
        setDias(0); setHoras(8); setMinutos(0);
        break;
      case "24h":
        setDias(1); setHoras(0); setMinutos(0);
        break;
      case "3d":
        setDias(3); setHoras(0); setMinutos(0);
        break;
      case "5d":
        setDias(5); setHoras(0); setMinutos(0);
        break;
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-4 bg-white">
      <div className="text-sm font-medium">Asignar técnico (TI)</div>

      <select
        className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm bg-white"
        value={selectedTi}
        onChange={(e) => setSelectedTi(e.target.value ? Number(e.target.value) : "")}
        disabled={yaAsignado || loading}
      >
        <option value="">Selecciona un TI</option>
        {tis.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username || u.email}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <Button onClick={asignar} disabled={loading}>
          {loading ? "Procesando..." : yaAsignado ? "Actualizar asignación" : "Asignar"}
        </Button>
        {yaAsignado && (
          <span className="text-xs text-slate-600">
            Asignado a <b>{ticket?.assignedTo?.username || ticket?.assignedTo?.email}</b>
          </span>
        )}
      </div>

      {/* ---------- SLA Opcional ---------- */}
      <div className="pt-3 border-t">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={setSlaEnabled}
            onChange={(e) => setSetSlaEnabled(e.target.checked)}
          />
        <span>Configurar SLA junto con la asignación</span>
        </label>

        {setSlaEnabled && (
          <div className="mt-3 space-y-3">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => applyPreset("8h")}>
                8h
              </Button>
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => applyPreset("24h")}>
                24h
              </Button>
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => applyPreset("3d")}>
                3 días
              </Button>
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => applyPreset("5d")}>
                5 días
              </Button>
            </div>

            {/* Tiempo total */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Días</label>
                <input
                  type="number"
                  min={0}
                  value={dias}
                  onChange={(e) => setDias(parseInt(e.target.value || "0", 10))}
                  className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Horas</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={horas}
                  onChange={(e) => setHoras(parseInt(e.target.value || "0", 10))}
                  className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Minutos</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutos}
                  onChange={(e) => setMinutos(parseInt(e.target.value || "0", 10))}
                  className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              Total: <b>{totalMinutos}</b> minutos
            </p>

            {/* Porcentajes */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Verde (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={greenPct}
                  onChange={(e) =>
                    setGreenPct(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))
                  }
                  className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Amarillo (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={yellowPct}
                  onChange={(e) =>
                    setYellowPct(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))
                  }
                  className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Rojo (%)</label>
                <input
                  type="number"
                  value={redPct}
                  readOnly
                  className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm bg-slate-50"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Los porcentajes se normalizan en backend; ideal mantener Verde+Amarillo ≤ 100.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
