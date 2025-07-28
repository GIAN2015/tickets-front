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

export async function getTickets(token: string) {
  const res = await fetch(`${API_BASE}/tickets`, {
    headers: {
      Authorization: `Bearer ${token}`,  // <--- IMPORTANTE
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error en backend:', errorText);
    throw new Error('Error al obtener tickets');
  }
  return res.json();
}


export async function createTicket(data: {
  title: string;
  description: string;
  category: string;
  prioridad: string;
}, token: string) {
  const res = await instance.post('/tickets', data);
  return res.data;
}

export async function getTicketHistory(ticketId: number) {
  const res = await instance.get(`/tickets/${ticketId}/history`);
  return res.data;
}

// lib/api.ts
export async function updateTicket(id: number, data: any, token: string) {
  const response = await fetch(`http://localhost:3001/tickets/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Error en backend:', text);
    throw new Error(`Error al actualizar ticket (${response.status})`);
  }

  return response.json();
}

// lib/api.ts
// lib/api.ts
// En src/lib/api.ts

export async function getUsuarios(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Error al obtener usuarios');
  }

  const data = await res.json();
  return data;
}





