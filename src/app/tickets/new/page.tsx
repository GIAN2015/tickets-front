'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import instance from '@/lib/api';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileUp, Tag, User, Layers, Flag, Type, X, Wrench
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/components/useAuthStore';

type TipoTicket = 'requerimiento' | 'incidencia' | 'consulta';
type Prioridad = 'muy_bajo' | 'bajo' | 'media' | 'alta' | 'muy_alta';

interface ApiUser {
  id: number;
  username?: string;
  email?: string;
  role?: string; // <- importante para filtrar
}

export default function NewTicketPage() {
  const router = useRouter();

  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const role = (useAuthStore((s) => s.user?.role) || '').toString().toLowerCase();

  // form
  const [archivos, setArchivos] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [categoria, setCategoria] = useState('mantenimiento');
  const [tipo, setTipo] = useState<TipoTicket>('incidencia');

  // listas solo para admin
  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);
  const [tis, setTis] = useState<ApiUser[]>([]);
  const [usuarioSolicitanteId, setUsuarioSolicitanteId] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);

  const categorias = [
    { label: '🛠 Mantenimiento', value: 'mantenimiento' },
    { label: '💻 Hardware', value: 'hardware' },
    { label: '🧑‍💻 Software', value: 'software' },
    { label: '🌐 Redes', value: 'redes' },
    { label: '📦 Otros', value: 'otros' },
  ];

  const tipos: { label: string; value: TipoTicket }[] = [
    { label: '📌 Requerimiento', value: 'requerimiento' },
    { label: '⚠ Incidencia', value: 'incidencia' },
    { label: '💬 Consulta', value: 'consulta' },
  ];

  // ✅ Trae todos los usuarios de la empresa y separa por rol en el cliente
  useEffect(() => {
    if (!hasHydrated || !token) return;
    if (!(role === 'admin' || role === 'super-admi')) return;

    (async () => {
      try {
        // Traemos todo, sin confiar en ?role=...
        const res = await instance.get('/users/by-empresa');
        const all: ApiUser[] = Array.isArray(res.data) ? res.data : res.data?.users ?? [];

        // Normaliza role a minúsculas por seguridad (por si viene 'TI' o enum)
        const norm = all.map(u => ({ ...u, role: (u.role || '').toString().toLowerCase() }));

        // Filtra: solicitantes (user) y técnicos (ti). Excluye admin/super-admi.
        setUsuarios(norm.filter(u => u.role === 'user'));
        setTis(norm.filter(u => u.role === 'ti'));
      } catch (err) {
        console.error('Error cargando usuarios:', err);
        setUsuarios([]);
        setTis([]);
      }
    })();
  }, [hasHydrated, token, role]);

  const handleFilesChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.currentTarget.files;
    if (!files || !files.length) return;
    setArchivos((prev) => [...prev, ...Array.from(files)]);
    e.currentTarget.value = '';
  };

  const eliminarArchivo = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasHydrated || !token) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('prioridad', prioridad);
      formData.append('categoria', categoria);
      formData.append('tipo', tipo);

      archivos.forEach((file) => formData.append('archivos', file));

      // Solo admin/super-admi puede enviar estos campos
      if (role === 'admin' || role === 'super-admi') {
        if (usuarioSolicitanteId) formData.append('usuarioSolicitanteId', usuarioSolicitanteId);
      }

      // 1) Crear ticket
      const createRes = await instance.post('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const created = createRes?.data;
      const ticketId: number = created?.id ?? created?.ticket?.id ?? created?.data?.id;
      if (!ticketId) throw new Error('No se obtuvo el ID del ticket creado');

      // 2) Si elegiste TI, asignar luego
      if ((role === 'admin' || role === 'super-admi') && assignedToId) {
        await instance.patch(`/tickets/${ticketId}/asignar`, { userId: Number(assignedToId) });
      }

      alert('✅ Ticket creado correctamente');
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err?.response?.data || err);
      alert(err?.response?.data?.message || 'Error al crear ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-200 rounded" />
          <div className="h-32 w-full bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div className="max-w-3xl mx-auto px-4 py-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-sky-600" /> Crear Ticket
          </CardTitle>
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="flex items-center gap-2 text-slate-700">
                <Tag className="w-4 h-4 text-slate-500" />
                Título
              </Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Problema con la impresora" required className="mt-1" />
            </div>

            <div>
              <Label className="flex items-center gap-2 text-slate-700">
                <Type className="w-4 h-4 text-slate-500" />
                Descripción
              </Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1 min-h-[110px]" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 text-slate-700">
                  <Wrench className="w-4 h-4 text-slate-500" />
                  Categoría
                </Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 text-slate-700">
                  <Flag className="w-4 h-4 text-slate-500" />
                  Prioridad
                </Label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as Prioridad)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="muy_bajo">Muy Bajo</SelectItem>
                    <SelectItem value="bajo">Bajo</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="muy_alta">Muy Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 text-slate-700">
                  <Type className="w-4 h-4 text-slate-500" />
                  Tipo de Ticket
                </Label>
                <Select value={tipo} onValueChange={(val) => setTipo(val as TipoTicket)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ✅ SOLO ADMIN/SUPER-ADMI ven estos selects */}
              {(role === 'admin' || role === 'super-admi') && (
                <>
                  <div>
                    <Label className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-500" />
                      Usuario solicitante
                    </Label>
                    <Select value={usuarioSolicitanteId} onValueChange={setUsuarioSolicitanteId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="-- Selecciona un usuario --" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.username || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-500" />
                      Asignar técnico (TI)
                    </Label>
                    <Select value={assignedToId} onValueChange={setAssignedToId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="-- Selecciona un TI --" />
                      </SelectTrigger>
                      <SelectContent>
                        {tis.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.username || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2 text-slate-700">
                <FileUp className="w-4 h-4 text-slate-500" />
                Adjuntar archivos (opcional)
              </Label>
              <Input type="file" accept=".pdf,image/*" multiple onChange={handleFilesChange} className="mt-1" />
              {archivos.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {archivos.map((f, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm">
                      <span className="truncate">{f.name}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => eliminarArchivo(idx)} aria-label="Eliminar archivo" className="hover:bg-rose-50">
                        <X className="w-4 h-4 text-rose-600" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-60">
              {submitting ? 'Creando...' : 'Crear Ticket'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
