import TicketStatusChanger from './TicketStatusChanger';
import TicketPrioridadChanger from './TicketPrioridadChanger';
import { Ticket } from '@/types';

interface Props {
  ticket: Ticket;
  onStatusChanged: (status: string) => void;
  onPrioridadChanged: (prioridad: string) => void;
}

export default function TicketCard({ ticket, onStatusChanged, onPrioridadChanged }: Props) {
  return (
    <div className="border rounded-xl p-4 shadow-md bg-white">
      <div className="font-bold text-lg">{ticket.titulo}</div>
      <div className="text-gray-600">{ticket.descripcion}</div>
      <div className="mt-2">
        <TicketStatusChanger
          ticketId={ticket.id}
          initialStatus={ticket.status}
          onStatusChange={onStatusChanged}
        />
        <TicketPrioridadChanger
          ticketId={ticket.id}
          initialPrioridad={ticket.prioridad}
          onPrioridadChange={onPrioridadChanged}
        />
      </div>
    </div>
  );
}
