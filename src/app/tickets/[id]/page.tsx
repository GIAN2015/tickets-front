'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

export default function TicketDetail() {
  const params = useParams(); // useParams es sincrónico y seguro
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    if (!params?.id) return; // Evita hacer fetch si aún no existe ID

    axios.get(`/api/tickets/${params.id}`).then((res) => {
      setTicket(res.data);
    });
  }, [params?.id]);

  if (!ticket) return <p className="text-center">Cargando...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold">Ticket: {ticket.title}</h1>
      <p>Descripción: {ticket.description}</p>
      <p>Estado: {ticket.status}</p>
      <p>Prioridad: {ticket.prioridad}</p>
    </div>
  );
}
