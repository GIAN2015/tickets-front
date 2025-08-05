'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket, getUsuarios } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';
import emailjs from '@emailjs/browser';
interface DecodedUser {
  id: number;
  role: 'user' | 'ti' | 'admin'; // ajusta si hay más roles
  nombre: string;
  email: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
}
export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [usuarios, setUsuarios] = useState<any[]>([]); // 👈 importante que sea arreglo

  const [usuarioSolicitanteId, setUsuarioSolicitanteId] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [role, setRole] = useState('');
  const [user, setUser] = useState<DecodedUser | null>(null);
  const [usuarioSolicitanteEmail, setUsuarioSolicitanteEmail] = useState('');

  const categorias = [
    { label: '🛠 Mantenimiento', value: 'mantenimiento' },
    { label: '💻 Hardware', value: 'hardware' },
    { label: '🧑‍💻 Software', value: 'software' },
    { label: '🌐 Redes', value: 'redes' },
    { label: '📦 Otros', value: 'otros' },
  ];

  const [categoria, setCategoria] = useState('mantenimiento');
  const [file, setFile] = useState<File | null>(null);




  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decoded: any = jwtDecode(token);
    setUser(decoded);

    if (decoded.rol === 'TI') {
      fetchUsuarios();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decoded: any = jwtDecode(token);
    console.log('Decoded JWT:', decoded);

    const userObj: DecodedUser = {
      id: Number(decoded.sub),
      role: decoded.role.toLowerCase(), // 👈 normalizamos a minúsculas
      nombre: decoded.username,
      email: decoded.email,
    };

    setUser(userObj);
  }, []);


  useEffect(() => {
    if (user?.role === 'ti') {
      fetch('http://localhost:3001/api/users')
        .then((res) => res.json())
        .then((data) => {
          console.log("Usuarios cargados:", data);
          setUsuarios(data);
        })
        .catch((err) => console.error('Error al obtener usuarios', err));
    }
  }, [user]);



  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      console.log('Respuesta cruda:', data);

      setUsuarios(data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };






  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No has iniciado sesión');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);

      const creadoPorId = Number(decoded.sub); // 👈 Usa sub como ID del creador

      const ticketData: any = {
        title,
        description,
        prioridad,
        categoria,
        creatorId: creadoPorId, // 👈 ahora es un número correcto
      };

      if (file) {
        const formData = new FormData();
        formData.append('archivo', file); // nombre del campo que tu backend espera
        // Aquí puedes usar formData para enviar el archivo si tu backend lo espera
        // Por ejemplo: await createTicket(formData, token);
      }
      // Si el usuario es TI, debe seleccionar un solicitante
      if (decoded.role.toLowerCase() === 'ti') {
        if (!usuarioSolicitanteId) {
          alert('Debes seleccionar un usuario solicitante');
          return;
        }

        ticketData.usuarioSolicitanteId = Number(usuarioSolicitanteId); // 👈 asegúrate de que es número
      }

      console.log('Datos que se envían:', ticketData);
      await createTicket(ticketData, token);
      const nuevoTicket = await createTicket(ticketData, token);


      const fechaActual = new Date().toLocaleString();

      // const templateParams = {
      //   id: nuevoTicket.id,
      //   name: decoded.username,
      //   email: usuarioSolicitanteEmail || (usuarios.find(u => u.id === Number(usuarioSolicitanteId))?.email ?? ''), // 👈 Aquí se usa el solicitante si existe
      //   // email2: decoded.email,
      //   title,
      //   category: categoria,
      //   priority: prioridad,
      //   message: description,
      //   time: fechaActual,
      // };

      // await emailjs.send(
      //   'service_abc123',
      //   'template_j8exnay',
      //   templateParams,
      //   'FBQ9PmnOeJKELISx3'
      // );

      alert('Ticket creado y notificación enviada con éxito');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error al crear ticket o enviar correo');
    }
  }



  return (

    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
      {/* Botón de volver */}
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="mb-4 flex items-center text-green-700 hover:text-green-900 font-medium transition"
      >
        ← Volver al ticket
      </button>

      {/* Título */}
      <h1 className="text-3xl font-bold text-black mb-6 text-center">🎫 Crear nuevo ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-black mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Problema con la impresora"
              required
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-black"
            />
          </div>

          <div>
            <label className="block font-medium text-black mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema en detalle..."
              required
              className="w-full border border-gray-300 px-4 py-2 rounded-md h-28 resize-none focus:ring-2 focus:ring-green-500 outline-none text-black"
            />
          </div>

          <div>
            <label className="block font-medium text-black mb-1">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-black"
            >
              {categorias.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {user?.role === 'ti' && (
          <div>
            <label className="block font-medium text-black mb-1">👤 Usuario solicitante</label>
            <select
              value={usuarioSolicitanteId}
              onChange={(e) => setUsuarioSolicitanteId(e.target.value)}
              required
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-black"
            >
              <option value="">-- Selecciona un usuario --</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.username || usuario.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block font-medium text-black mb-1">⚠️ Prioridad</label>
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-black"
          >
            <option value="muy_bajo">Muy Bajo</option>
            <option value="bajo">Bajo</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="muy_alta">Muy Alta</option>
          </select>
        </div>
        <div>
          <label className="block font-medium text-black mb-1">📎 Adjuntar archivo (opcional)</label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => {
              if (e.target.files) {
                setFile(e.target.files[0]);
              }
            }}
            className="w-full text-black"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white font-semibold py-3 rounded-md hover:bg-green-700 transition duration-200"
        >
          🚀 Crear Ticket
        </button>
      </form>
    </div>

  );
}
