// src/lib/api.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api'; // ← Agrega /api al final


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

export async function login(email: string, password: string) {
  console.log('Enviando login:', { email, password });

  const res = await instance.post('/auth/login', {
    email,
    password,
  });

  return res.data; // { access_token: string }
}

export async function getTickets(token: string) {
  const res = await fetch(`${API_BASE}/tickets`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error en backend:', errorText);
    throw new Error('Error al obtener tickets');
  }
  return res.json();
}


export async function createTicket(formData: FormData, token: string) {
  const response = await fetch('http://localhost:3001/api/tickets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Error al crear ticket');
  }

  return await response.json();
}



// lib/api.ts
export async function updateTicket(id: number, data: any, token: string) {
  const response = await fetch(`http://localhost:3001/api/tickets/${id}`, {
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



export async function getUsuarios(token: string) {
  const res = await fetch('http://localhost:3001/api/users', {
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

// Confirma que el ticket fue resuelto por parte del usuario
export async function confirmarResolucionTicket(ticketId: number) {
  const token = localStorage.getItem('token');

  const res = await instance.patch(`tickets/${ticketId}/confirmar`, {}, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res || res.status !== 200) {
    throw new Error('Error al confirmar la resolución del ticket');
  }

  console.log("Respuesta del backend al confirmar:", res.data);

  return res.data;
}

export async function getTicketHistory(id: number) {
  const res = await instance.get(`/tickets/${id}/historial`);
  return res.data;
}




export const rechazarResolucionTicket = async (ticketId: number) => {
  const token = localStorage.getItem('token');

  const res = await instance.patch(
    `/tickets/${ticketId}/rechazar`,
    {}, // cuerpo vacío
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (res.status >= 400) {
    throw new Error('Error al rechazar resolución');
  }

  return res.data;
};


export const resetearRechazoResolucion = async (ticketId: number) => {
  const token = localStorage.getItem('token');

  const res = await instance.patch(
    `/tickets/${ticketId}/reset-rechazo`, // nueva ruta backend
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status >= 400) {
    throw new Error('Error al resetear rechazo de resolución');
  }

  return res.data;
};

export async function getTicketById(ticketId: number | string) {
  const res = await instance.get(`/tickets/${ticketId}`);
  return res.data;
}


// Crear empresa + admin inicial
export async function registerEmpresaAdmin(data: {
  razonSocial: string;
  telefono: string;
  correoContacto: string;
  ruc: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}) {
  const res = await instance.post("api/auth/register", data);
  return res.data;
}

// Crear usuario
export async function createUsuario(data: {
  username: string;
  email: string;
  password: string;
  role: string;
}) {
  const token = localStorage.getItem("token"); // o de donde lo guardes

  const res = await instance.post("/users", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

