// src/lib/api.ts
import { useAuthStore } from '@/components/useAuthStore';
import axios from 'axios';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api' ;

// Instancia de axios
const instance = axios.create({
  baseURL: API_BASE,
});

// Interceptor para añadir dinámicamente el token
instance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Siempre obtenemos el token actualizado del storea
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default instance;

/* =======================
   FUNCIONES API
========================== */

export async function login(email: string, password: string) {
  const res = await instance.post('/auth/login', { email, password });
  return res.data; // { access_token: string }
}

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

export async function getUsuarios() {
  const res = await instance.get('/users');
  return res.data;
}

export async function confirmarResolucionTicket(ticketId: number) {
  const res = await instance.patch(`/tickets/${ticketId}/confirmar`);
  return res.data;
}

export async function getTicketHistory(id: number) {
  const res = await instance.get(`/tickets/${id}/historial`);
  return res.data;
}

export async function getEmpresaById(EmpresaId: number | string) {
  const res = await instance.get(`/empresas/${EmpresaId}`);
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

export async function getTicketById(ticketId: number | string) {
  const res = await instance.get(`/tickets/${ticketId}`);
  return res.data;
}

export async function registerEmpresaAdmin(data: {
  razonSocial: string;
  telefono: string;
  correoContacto: string;
  ruc: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}) {
  const res = await instance.post("/auth/register", data);
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
