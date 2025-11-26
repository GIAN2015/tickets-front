
"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useAuthStore } from "../useAuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL; // asegúrate que esto exista

type NotificationItem = {
  id: number;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  ticketId?: number | null;
};

export default function NotificationBell() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const hasAuth = !!token; 
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // 🔢 Traer solo el contador (para el badge)
  const fetchCount = useCallback(async () => {
     if (!hasAuth || !API_URL) return;  
    try {
      const res = await fetch(`${API_URL}/notifications/me/unread-count`, {
        headers: authHeaders,
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch (err) {
      console.error("Error fetching unread count", err);
    }
  }, [hasAuth, authHeaders]);

  // 📋 Traer la lista completa
  const fetchList = useCallback(async () => {
    if (!hasAuth) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications/me`, {
        headers: authHeaders,
        credentials: "include",
      });
      if (!res.ok) return;
      const data: NotificationItem[] = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  }, [hasAuth, authHeaders]);

  // 🧹 Marcar todas como leídas en el backend
  const markAllAsRead = useCallback(async () => {
    if (!hasAuth) return;
    try {
      await fetch(`${API_URL}/notifications/me/read-all`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read", err);
    }
  }, [hasAuth, authHeaders]);

  // ⏱️ Polling del contador cada 30s
  useEffect(() => {
    if (!hasHydrated || !hasAuth) return;
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [hasHydrated, hasAuth, fetchCount]);

  if (!hasHydrated || !hasAuth) return null;

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);

    if (next) {
      await fetchList();
      if (count > 0) {
        // si había no leídas, márcalas
        await markAllAsRead();
      }
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100 transition"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-50">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              Notificaciones
            </span>
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            )}
          </div>

          {items.length === 0 && !loading && (
            <div className="px-3 py-4 text-sm text-slate-500">
              No tienes notificaciones por ahora.
            </div>
          )}

          {items.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2 text-sm ${
                    n.read ? "bg-white" : "bg-sky-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-sky-500" />
                    <div className="flex-1">
                      <p className="text-slate-800">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(n.createdAt)}
                        {n.ticketId ? ` · Ticket #${n.ticketId}` : ""}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
