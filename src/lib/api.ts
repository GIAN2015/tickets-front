// src/lib/api.ts
import { useAuthStore } from '@/components/useAuthStore';
import axios from 'axios';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Instancia de axios
const instance = axios.create({
  baseURL: API_BASE,
});

// Interceptor para añadir dinámicamente el token
instance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Siempre obtenemos el token actualizado del store
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default instance;

/* =======================
   HELPERS
========================== */

function decodeJwt<T = any>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    const json =
      typeof window === "undefined"
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(
            atob(payload)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* =======================
   AUTH API
========================== */

export async function login(email: string, password: string) {
  const res = await instance.post("/auth/login", { email, password });
  const { access_token } = res.data;

  // Decodifica el JWT para obtener datos del usuario
  const payload = decodeJwt(access_token) as {
    sub?: number;
    id?: number;
    role?: string;
    email?: string;
    username?: string;
    empresaId?: number | string;
    [k: string]: any;
  } | null;

  // Construye el objeto user para el store
  const user = payload
    ? {
        id: payload.id ?? payload.sub ?? null,
        role: payload.role ?? null,
        email: payload.email ?? null,
        username: payload.username ?? null,
        empresaId: payload.empresaId ?? null,
      }
    : null;

  // Guarda token + user mínimo
  const { setAuth } = useAuthStore.getState();
  setAuth(access_token, user);

  // ⭐ OPCIONAL: completar empresaNombre para el Header
  try {
    if (user?.empresaId != null) {
      const empRes = await instance.get(`/empresas/${user.empresaId}`);
      const empresaNombre =
        empRes?.data?.razonSocial ??
        empRes?.data?.nombre ??
        empRes?.data?.razon_social ??
        null;

      // volvemos a setear auth con empresaNombre (no cambia el token)
      setAuth(access_token, { ...user, empresaNombre });
    }
  } catch {
    // si falla, no rompemos el login
  }

  return res.data; // por si el caller necesita algo extra
}

/* =======================
   TICKETS API
========================== */

export async function getTickets() {
  const res = await instance.get('/tickets');
  return res.data;
}

export async function createTicket(formData: FormData) {
  const res = await instance.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getTicketById(ticketId: number | string) {
  const res = await instance.get(`/tickets/${ticketId}`);
  return res.data;
}

export async function confirmarResolucionTicket(ticketId: number) {
  const res = await instance.patch(`/tickets/${ticketId}/confirmar`);
  return res.data;
}

export async function rechazarResolucionTicket(ticketId: number) {
  try {
    const res = await instance.patch(`/tickets/${ticketId}/rechazar`);
    return res.data;
  } catch (err: any) {
    console.error("Error al rechazar resolución:", err?.response?.data || err);
    throw new Error(err?.response?.data?.message || "Error al rechazar resolución");
  }
}

export async function resetearRechazoResolucion(ticketId: number) {
  const res = await instance.patch(`/tickets/${ticketId}/reset-rechazo`);
  return res.data;
}

export async function getTicketHistory(id: number) {
  const res = await instance.get(`/tickets/${id}/historial`);
  return res.data;
}

/* =======================
   USUARIOS / EMPRESA API
========================== */

export async function getUsuarios() {
  const res = await instance.get('/users');
  return res.data;
}

export async function getUsersByEmpresa(role?: 'user' | 'ti' | 'admin' | 'super-admi') {
  const url = role ? `/users/by-empresa?role=${role}` : '/users/by-empresa';
  const res = await instance.get(url);
  return Array.isArray(res.data) ? res.data : res.data?.users ?? [];
}

export async function getEmpresaById(empresaId: number | string) {
  const res = await instance.get(`/empresas/${empresaId}`);
  return res.data;
}

export async function createUsuario(data: {
  username: string;
  email: string;
  password: string;
  role: string;
}) {
  const res = await instance.post("/users", data);
  return res.data;
}

/* =======================
   REGISTRO EMPRESA + ADMIN
========================== */

export async function registerEmpresaAdmin(data: {
  razonSocial: string;
  telefono: string;
  correoContacto: string;
  ruc: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
  smtpPassword?: string; // <-- AÑADIDO (opcional si tu backend lo acepta)
}) {
  try {
    const res = await instance.post("/auth/register", data);
    return res.data;
  } catch (err: any) {
    // Normaliza mensaje de error para el caller
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Error al registrar empresa/admin";
    throw new Error(msg);
  }
}
