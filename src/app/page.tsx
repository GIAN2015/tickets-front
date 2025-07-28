// src/lib/api.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3001'; // URL de tu backend NestJS

const instance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token automáticamente
instance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default instance;

// Funciones API

export async function login(username: string, password: string) {
  console.log('Enviando login:', { username, password });

  const res = await instance.post('/auth/login', {
    username,
    password,
  });

  return res.data; // { access_token: string }
}

export async function getTickets() {
  const res = await instance.get('/tickets');
  return res.data;
}

export async function createTicket(data: {
  title: string;
  description: string;
  category: string;
  prioridad: string;
}) {
  const res = await instance.post('/tickets', data);
  return res.data;
}

export async function getTicketHistory(ticketId: number) {
  const res = await instance.get(`/tickets/${ticketId}/history`);
  return res.data;
}

export async function updateTicketStatus(ticketId: number, status: string) {
  const res = await instance.patch(`/tickets/${ticketId}/status`, { status });
  return res.data;
}
