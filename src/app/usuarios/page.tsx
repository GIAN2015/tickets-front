"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import instance from "@/lib/api";
import { useAuthStore } from "@/components/useAuthStore";
import { Plus, Pencil, Power, CheckCircle2, XCircle } from "lucide-react";

/* ---------- Types ---------- */
type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
};

/* ---------- Reusable Confirm Dialog ---------- */
function ConfirmDialog({
  open,
  title = "Confirmar acción",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const id = setTimeout(() => firstBtnRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-6"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {title}
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-6">{message}</div>
        <div className="flex items-center justify-end gap-2">
          <button
            ref={firstBtnRef}
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-4 py-2"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="inline-flex items-center bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg px-4 py-2"
          >
            {busy ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function UsuariosPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // estado del modal de confirmación
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);


  useEffect(() => {

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await instance.get("/users/by-empresa");
      const data = Array.isArray(res.data) ? res.data : res.data?.users ?? [];
      setUsers(data);
    } catch (err: any) {
      console.error("❌ Error cargando usuarios:", err?.response?.data || err);
      setErrorMsg(err?.response?.data?.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  const onEditClick = (u: User) => {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditPassword("");
  };

  // acción real de guardado
  const handleSaveAction = async () => {
    if (!editingUser) return;
    const body: any = { username: editUsername, email: editEmail };
    if (editPassword.trim()) body.password = editPassword;
    await instance.patch(`/users/${editingUser.id}`, body);
    setEditingUser(null);
    await fetchUsers();
  };

  // abre confirmación para guardar
  const handleSaveAskConfirm = () => {
    if (!editingUser) return;
    setConfirm({
      open: true,
      title: "Guardar cambios",
      message: (
        <div>
          ¿Deseas guardar los cambios para{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">{editingUser.username}</span>?
          <ul className="mt-3 text-xs text-slate-600 dark:text-slate-300 list-disc pl-5">
            <li>Usuario: <b>{editUsername}</b></li>
            <li>Correo: <b>{editEmail}</b></li>
            {editPassword.trim() && <li>Se actualizará la contraseña</li>}
          </ul>
        </div>
      ),
      confirmText: "Guardar",
      onConfirm: async () => {
        try {
          await handleSaveAction();
        } catch (err: any) {
          console.error("❌ Error backend:", err?.response?.data || err);
          alert(err?.response?.data?.message || "No se pudo actualizar el usuario.");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  // acción real de toggle
  const toggleActiveAction = async (user: User) => {
    await instance.patch(`/users/${user.id}/toggle`);
    await fetchUsers();
  };

  // abre confirmación para toggle
  const askToggleConfirm = (user: User) => {
    const willDisable = user.isActive;
    setConfirm({
      open: true,
      title: willDisable ? "Deshabilitar usuario" : "Habilitar usuario",
      message: (
        <div>
          ¿Estás seguro de {willDisable ? "deshabilitar" : "habilitar"} al usuario{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">{user.username}</span>?
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {willDisable
              ? "El usuario no podrá acceder al sistema hasta ser habilitado nuevamente."
              : "El usuario recuperará el acceso al sistema."}
          </p>
        </div>
      ),
      confirmText: willDisable ? "Deshabilitar" : "Habilitar",
      onConfirm: async () => {
        try {
          await toggleActiveAction(user);
        } catch (err: any) {
          console.error("❌ Error toggle:", err?.response?.data || err);
          alert(err?.response?.data?.message || "No se pudo cambiar el estado del usuario.");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="border border-slate-200/60 dark:border-slate-800 p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-48 bg-slate-200/70 dark:bg-slate-800 rounded" />
            <div className="h-10 w-full bg-slate-200/70 dark:bg-slate-800 rounded" />
            <div className="h-40 w-full bg-slate-200/70 dark:bg-slate-800 rounded" />
          </div>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="border border-rose-200/60 dark:border-rose-900 p-6 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      );
    }

    if (!users.length) {
      return (
        <div className="border border-slate-200/60 dark:border-slate-800 p-8 rounded-xl bg-white dark:bg-slate-900 shadow-sm text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-4">Aún no hay usuarios registrados.</p>
          <Link
            href="/usuarios/registro"
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar nuevo usuario
          </Link>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
            <tr>
              <th className="text-left font-medium px-4 py-3">ID</th>
              <th className="text-left font-medium px-4 py-3">Usuario</th>
              <th className="text-left font-medium px-4 py-3">Correo</th>
              <th className="text-left font-medium px-4 py-3">Rol</th>
              <th className="text-left font-medium px-4 py-3">Estado</th>
              <th className="text-left font-medium px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.id}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{u.username}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60">
                    {u.role?.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600">
                      <XCircle className="w-4 h-4" /> Deshabilitado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditClick(u)}
                      className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => askToggleConfirm(u)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-white ${
                        u.isActive
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                      title={u.isActive ? "Deshabilitar" : "Habilitar"}
                    >
                      <Power className="w-4 h-4" />
                      {u.isActive ? "Deshabilitar" : "Habilitar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [loading, errorMsg, users]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">👥 Gestión de Usuarios</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Crea, edita y administra los accesos del sistema de tickets.
            </p>
          </div>
          <Link
            href="/usuarios/registro"
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar nuevo usuario
          </Link>
        </div>

        {content}
      </div>

      {/* Modal editar (form) */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">✏️ Editar usuario</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="h-10 w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Correo</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="h-10 w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAskConfirm}
                className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación reutilizable */}
      <ConfirmDialog
        open={Boolean(confirm?.open)}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmText={confirm?.confirmText || "Confirmar"}
        onConfirm={confirm?.onConfirm || (() => {})}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
