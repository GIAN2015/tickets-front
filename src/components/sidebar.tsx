// components/Sidebar.tsx (o donde tengas tu menú lateral)

import Link from 'next/link';

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>

      <nav className="space-y-2">
        <Link href="/dashboard">Inicio</Link>
        {/* 👇 Nuevo link */}
        <Link href="/tickets/completados" className="text-green-400 hover:underline">
          Tickets Completados
        </Link>
      </nav>
    </div>
  );
}
