'use client';
import { ArrowLeft, FileUp, Tag, User, Layers, Flag, Type, X } from "lucide-react";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

import emailjs from '@emailjs/browser';
interface DecodedUser {
  id: number;
  role: 'user' | 'ti' | 'admin';
  nombre: string;
  email: string;
}

interface ApiUser {
  id: number;
  username?: string;
  email: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [categoria, setCategoria] = useState('mantenimiento');
  const [tipo, setTipo] = useState<'requerimiento' | 'incidencia' | 'consulta'>('incidencia');
  const [archivo, setArchivo] = useState<File | null>(null);

  const [user, setUser] = useState<DecodedUser | null>(null);

  // 👇 NUEVO: estado para usuarios y el solicitante seleccionado
  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);
  const [usuarioSolicitanteId, setUsuarioSolicitanteId] = useState('');

  const categorias = [
    { label: '🛠 Mantenimiento', value: 'mantenimiento' },
    { label: '💻 Hardware', value: 'hardware' },
    { label: '🧑‍💻 Software', value: 'software' },
    { label: '🌐 Redes', value: 'redes' },
    { label: '📦 Otros', value: 'otros' },
  ];

  const tipos = [
    { label: '📌 Requerimiento', value: 'requerimiento' },
    { label: '⚠ Incidencia', value: 'incidencia' },
    { label: '💬 Consulta', value: 'consulta' },
  ];

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convertimos FileList en array y los agregamos
      setArchivos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };
  const eliminarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decoded: any = jwtDecode(token);
    setUser({
      id: Number(decoded.sub),
      role: decoded.role?.toLowerCase(),
      nombre: decoded.username,
      email: decoded.email,
    });
  }, []);

  // Si es TI, carga la lista de usuarios desde el backend

  // Si es TI, carga la lista de usuarios desde el backend
  // Si es TI, carga la lista de usuarios de su empresa desde el backend
  useEffect(() => {
    if (user?.role !== "ti") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    (async () => {
      try {
        const res = await fetch("http://localhost:3001/api/users/by-empresa", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (Array.isArray(data)) {
          setUsuarios(data);
        } else if (data?.users) {
          setUsuarios(data.users); // por si backend devuelve { users: [...] }
        } else {
          setUsuarios([]);
        }
      } catch (err) {
        console.error("Error al obtener usuarios", err);
        setUsuarios([]);
      }
    })();
  }, [user]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No has iniciado sesión');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      const creadoPorId = Number(decoded.sub);

      // Usa FormData en lugar de ticketData plano
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('prioridad', prioridad);
      formData.append('categoria', categoria);
      formData.append('tipo', tipo); // valor fijo
      formData.append('creatorId', String(creadoPorId)); // no usado directamente en el backend, pero por si acaso

      if (archivos.length > 0) {
        archivos.forEach((file) => {
          formData.append('archivos', file); // 👈 usa el mismo nombre que en el backend
        });
      }


      if (decoded.role.toLowerCase() === 'ti') {
        if (!usuarioSolicitanteId) {
          alert('Debes seleccionar un usuario solicitante');
          return;
        }
        formData.append('usuarioSolicitanteId', usuarioSolicitanteId);
      }

      // ✅ Llamada con FormData correctamente





      // ✅ En tu handleSubmit, justo después de:
      const ticket = await createTicket(formData, token);





      router.push('/dashboard');



      alert('Ticket creado y notificación enviada con éxito');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error al crear ticket o enviar correo');
    }
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto mt-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="shadow-xl border border-gray-200">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-green-700">
            <Layers className="w-6 h-6" /> Crear Ticket
          </CardTitle>
          <Button
            variant="ghost"
            className="text-green-700 hover:text-green-900"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> Volver
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" /> Título
              </Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Problema con la impresora"
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Descripción
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema en detalle..."
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> Categoría
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
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

            {/* 👇 Visible solo para rol TI */}
            {user?.role === "ti" && (
              <div>
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Usuario solicitante
                </Label>
                <Select
                  value={usuarioSolicitanteId}
                  onValueChange={setUsuarioSolicitanteId}
                >
                  <SelectTrigger>
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
            )}

            <div>
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Tipo de Ticket
              </Label>
              <Select
                value={tipo}
                onValueChange={(val: "requerimiento" | "incidencia" | "consulta") =>
                  setTipo(val)
                }
              >
                <SelectTrigger>
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

            <div>
              <Label className="flex items-center gap-2">
                <Flag className="w-4 h-4" /> Prioridad
              </Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger>
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

            <div>
              <Label className="flex items-center gap-2">
                <FileUp className="w-4 h-4" /> Adjuntar archivos (opcional)
              </Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={handleFilesChange}
              />

              {/* Lista de archivos seleccionados */}
              {archivos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {archivos.map((archivo, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-md text-sm"
                    >
                      <span>{archivo.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => eliminarArchivo(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
            >
              Crear Ticket
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}


