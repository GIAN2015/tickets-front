"use client";

import { useMemo, useState } from "react";
import instance from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  ticketId: number;
  onSaved?: () => Promise<void> | void;
  /** valores actuales del ticket (opcionales) */
  currentTotalMin?: number;
  currentGreenEnd?: string;
  currentYellowEnd?: string;
  currentDeadline?: string;
};

export default function AdminSLAForm({
  ticketId,
  onSaved,
  currentTotalMin,
}: Props) {
  const [open, setOpen] = useState(false);

  // Inputs de tiempo (para UX). El backend SOLO usa "dias"
  const [dias, setDias] = useState<number>(currentTotalMin ? Math.floor(currentTotalMin / (60 * 24)) : 0);
  const [horas, setHoras] = useState<number>(currentTotalMin ? Math.floor((currentTotalMin % (60 * 24)) / 60) : 0);
  const [minutos, setMinutos] = useState<number>(currentTotalMin ? (currentTotalMin % 60) : 0);

  // Porcentajes visibles (0..100). El backend espera 0..1
  const [greenPct, setGreenPct] = useState<number>(40);
  const [yellowPct, setYellowPct] = useState<number>(40);

  const redPct = useMemo(() => Math.max(0, 100 - greenPct - yellowPct), [greenPct, yellowPct]);

  const totalMin = useMemo(() => (dias * 24 * 60) + (horas * 60) + minutos, [dias, horas, minutos]);

  const presets = [
    { label: "8h", d: 0, h: 8, m: 0 },
    { label: "24h", d: 1, h: 0, m: 0 },
    { label: "3 días", d: 3, h: 0, m: 0 },
    { label: "5 días", d: 5, h: 0, m: 0 },
  ];

  const save = async () => {
    if (totalMin <= 0) {
      alert("El tiempo total debe ser mayor a 0.");
      return;
    }
    if (greenPct + yellowPct > 100) {
      alert("La suma de verde + amarillo no puede superar 100%.");
      return;
    }

    // 👉 El backend espera DIAS >= 1 (entero). Convertimos tu total a días.
    const diasEnteros = Math.max(1, Math.ceil(totalMin / (24 * 60)));

    // 👉 Convertimos 40 → 0.40 (decimales 0..1)
    const greenPctDec = Math.min(1, Math.max(0, greenPct / 100));
    const yellowPctDec = Math.min(1, Math.max(0, yellowPct / 100));

    try {
      await instance.patch(`/tickets/${ticketId}/sla`, {
        dias: diasEnteros,
        greenPct: greenPctDec,
        yellowPct: yellowPctDec,
        // redPct es opcional; tu servicio normaliza si no se envía
      });

      setOpen(false);
      if (onSaved) await onSaved();
      alert("✅ SLA configurado correctamente");
    } catch (err: any) {
      console.error(err?.response?.data || err);
      alert(err?.response?.data?.message || "No se pudo configurar el SLA.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Configurar SLA</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar SLA del ticket</DialogTitle>
          <DialogDescription>
            Define el tiempo objetivo y la distribución del semáforo (verde/amarillo/rojo).
          </DialogDescription>
        </DialogHeader>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="secondary"
              onClick={() => { setDias(p.d); setHoras(p.h); setMinutos(p.m); }}
              className="h-8 px-3 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Tiempo total */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Días</Label>
            <Input
              type="number"
              min={0}
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value || "0", 10))}
            />
          </div>
          <div>
            <Label>Horas</Label>
            <Input
              type="number"
              min={0}
              value={horas}
              onChange={(e) => setHoras(parseInt(e.target.value || "0", 10))}
            />
          </div>
          <div>
            <Label>Minutos</Label>
            <Input
              type="number"
              min={0}
              value={minutos}
              onChange={(e) => setMinutos(parseInt(e.target.value || "0", 10))}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          Total: <b>{totalMin}</b> minutos. (se enviará como <b>{Math.max(1, Math.ceil(totalMin / (24 * 60)))}</b> día/s)
        </p>

        {/* Porcentajes */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Verde (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={greenPct}
              onChange={(e) => setGreenPct(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))}
            />
          </div>
          <div>
            <Label>Amarillo (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={yellowPct}
              onChange={(e) => setYellowPct(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))}
            />
          </div>
          <div>
            <Label>Rojo (%)</Label>
            <Input type="number" value={redPct} readOnly />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
