"use client";

import { useEffect, useState } from "react";
import {
  confirmarResolucionTicket,
  getTickets,
  rechazarResolucionTicket,
} from "@/lib/api";
import TicketStatusChanger from "@/components/TicketStatusChanger";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { useParams, useRouter } from "next/navigation";
import emailjs from "@emailjs/browser";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Usuario {
  username: string;
  id: number;
  nombre: string;
  email: string;
  role: string;
}

type Ticket = {
  id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  confirmadoPorUsuario?: boolean; // opcional
};

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [userRole, setUserRole] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(
    null
  );
  const [userId, setUserId] = useState<number | null>(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(
    null
  );
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const ticketsPorPagina = 8;
  const router = useRouter();

  const tipos = [
    { label: "Todos", value: null },
    { label: "Requerimiento", value: "requerimiento" },
    { label: "Incidencia", value: "incidencia" },
    { label: "Consulta", value: "consulta" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // ✅ Confirmar y rechazar resolución con email
  const confirmarResolucion = async (ticketId: number) => {
    try {
      await confirmarResolucionTicket(ticketId);
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
      await rechazarResolucionTicket(ticketId);
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

  // ✅ Cargar usuarios
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:3001/api/users/by-empresa", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsuarios(data);
        } else if (data?.users) {
          setUsuarios(data.users); // 👈 si backend devuelve empresa con users
        } else {
          setUsuarios([]); // fallback vacío
        }
      })
      .catch((err) => console.error("Error al cargar usuarios:", err));
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const decoded: any = jwtDecode(token);
    setUserRole(decoded.role);
    setUserId(Number(decoded.sub));

    getTickets(token)
      .then(setTickets)
      .catch(() => alert("Error al obtener tickets"));
  }, []);

  // ✅ Filtrar tickets
  const ticketsFiltrados = tickets
    .filter((t: any) => !estadoSeleccionado || t.status === estadoSeleccionado)
    .filter((t: any) => t.status !== "completado")
    .filter((t: any) => !tipoSeleccionado || t.tipo === tipoSeleccionado)
    .filter(
      (t: any) =>
        !usuarioSeleccionado ||
        t.creator?.id === usuarioSeleccionado ||
        t.usuarioSolicitante?.id === usuarioSeleccionado
    )
    .filter(
      (t: any) =>
        !busquedaAplicada ||
        t.title.toLowerCase().includes(busquedaAplicada.toLowerCase()) ||
        String(t.id).includes(busquedaAplicada)
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const indiceInicio = (paginaActual - 1) * ticketsPorPagina;
  const ticketsPaginados = ticketsFiltrados.slice(
    indiceInicio,
    indiceInicio + ticketsPorPagina
  );
  const totalPaginas = Math.ceil(ticketsFiltrados.length / ticketsPorPagina);

  function fetchTicket(arg0: string) {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto text-gray-900">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold"> Panel de Tickets</h1>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-4 mb-6">
        <Link href="/tickets/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            ➕ Crear Ticket
          </Button>
        </Link>
        <Link href="/tickets/completados">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            ✅ Ver Completados
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {userRole === "ti" && (
          <div>
            <label className="text-sm font-medium">👤 Usuario</label>
            <select
              value={usuarioSeleccionado ?? ""}
              onChange={(e) =>
                setUsuarioSeleccionado(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              className="w-full border rounded px-3 py-2"
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
          <label className="text-sm font-medium">📌 Estado</label>
          <select
            value={estadoSeleccionado ?? ""}
            onChange={(e) => setEstadoSeleccionado(e.target.value || null)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="asignado">Asignado</option>
            <option value="en progreso">En Progreso</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">🔍 Buscar</label>
          <div className="flex">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="ID o título..."
              className="flex-1 border rounded-l px-3 py-2"
            />
            <Button
              onClick={() => {
                setBusquedaAplicada(busqueda);
                setPaginaActual(1);
              }}
              className="rounded-l-none"
            >
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs de tipo */}
      <div className="flex gap-2 mb-6">
        {tipos.map((t) => (
          <Button
            key={t.label}
            variant={tipoSeleccionado === t.value ? "default" : "outline"}
            onClick={() => setTipoSeleccionado(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Lista de tickets como tarjetas */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ticketsPaginados.map((ticket: any) => (

          <Card
            key={ticket.id}
            className="shadow-md border border-gray-200 hover:shadow-lg transition"
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-700">
                <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                  #{ticket.id} - {ticket.title}</Link>
              </CardTitle>
              <CardDescription>{ticket.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <span className="font-semibold">Estado:</span> {ticket.status}
              </p>
              <p>
                <span className="font-semibold">Prioridad:</span>{" "}
                {ticket.prioridad}
              </p>
              <p>
                <span className="font-semibold">Tipo:</span> {ticket.tipo}
              </p>
              <p>
                <span className="font-semibold">Categoría:</span>{" "}
                {ticket.categoria}
              </p>
              <p>
                <span className="font-semibold">Creador:</span>{" "}
                {ticket.creator?.username || ticket.creator?.email}
              </p>

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
                message="Resolviendo ticket..." // 👈 aquí agregas message
               
              />



              {userRole === "user" &&
                ticket.status === "resuelto" &&
                !ticket.confirmadoPorUsuario && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => confirmarResolucion(ticket.id)}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      Confirmar
                    </Button>
                    {!ticket.rechazadoPorUsuario && (
                      <Button
                        onClick={() => rechazarResolucion(ticket.id)}
                        className="bg-red-600 hover:bg-red-700 text-white flex-1"
                      >
                        Rechazar
                      </Button>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginación */}
      <div className="flex justify-center mt-8 gap-2">
        <Button
          disabled={paginaActual === 1}
          onClick={() => setPaginaActual((prev) => prev - 1)}
          variant="outline"
        >
          ⬅️ Anterior
        </Button>
        {Array.from({ length: totalPaginas }, (_, i) => (
          <Button
            key={i + 1}
            onClick={() => setPaginaActual(i + 1)}
            variant={paginaActual === i + 1 ? "default" : "outline"}
          >
            {i + 1}
          </Button>
        ))}
        <Button
          disabled={paginaActual === totalPaginas}
          onClick={() => setPaginaActual((prev) => prev + 1)}
          variant="outline"
        >
          Siguiente ➡️
        </Button>
      </div>
    </div>
  );
}