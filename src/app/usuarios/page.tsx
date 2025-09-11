"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    password?: string;
};

type TokenPayload = {
    sub: number;
    username: string;
    role: string;
    iat: number;
    exp: number;
};

function parseJwt(token: string): TokenPayload | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const decoded = parseJwt(token);
        if (!decoded || decoded.role !== "admin") {
            alert("❌ No tienes permisos para acceder a esta página");
            router.push("/");
            return;
        }

        fetchUsers(token);
    }, []);

    const fetchUsers = async (token: string) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:3001/api/users/by-empresa", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error("❌ Error cargando usuarios:", err);
        }
    };

    // 🔹 Guardar cambios
    const handleSave = async () => {
        if (!editingUser) return;

        try {
            const token = localStorage.getItem("token");

            // 🚀 Solo mandamos lo permitido por el DTO
            const body: any = {
                username: editingUser.username,
                email: editingUser.email,
            };

            if (editingUser.password && editingUser.password.trim() !== "") {
                body.password = editingUser.password;
            }

            // 👇 IMPORTANTE: NO mandamos isActive aquí
            // Eso solo se cambia con /toggle

            const res = await fetch(
                `http://localhost:3001/api/users/${editingUser.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                console.error("❌ Error backend:", errorData);
                alert("Error: " + (errorData.message || "No se pudo actualizar"));
                return;
            }

            alert("✅ Usuario actualizado correctamente");
            setEditingUser(null);
            fetchUsers(token!);
        } catch (err) {
            console.error(err);
            alert("❌ Error al actualizar usuario");
        }
    };


    const toggleActive = async (user: User) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await fetch(`http://localhost:3001/api/users/${user.id}/toggle`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchUsers(token); // refresca la lista
        } catch (err) {
            console.error(err);
        }
    };


    return (
        <div className="max-w-4xl mx-auto mt-8">
            <h1 className="text-2xl font-bold mb-4">👥 Gestión de Usuarios</h1>

            <table className="w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2">ID</th>
                        <th className="border p-2">Nombre</th>
                        <th className="border p-2">Correo</th>
                        <th className="border p-2">Rol</th>
                        <th className="border p-2">Estado</th>
                        <th className="border p-2">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td className="border p-2">{u.id}</td>
                            <td className="border p-2">{u.username}</td>
                            <td className="border p-2">{u.email}</td>
                            <td className="border p-2">{u.role}</td>
                            <td className="border p-2">
                                {u.isActive ? "✅ Activo" : "🚫 Deshabilitado"}
                            </td>
                            <td className="border p-2">
                                <button
                                    onClick={() => setEditingUser(u)}
                                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => toggleActive(u)}
                                    className={`${u.isActive ? "bg-red-500" : "bg-green-500"} text-white px-2 py-1 rounded`}
                                >
                                    {u.isActive ? "Deshabilitar" : "Habilitar"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="bg-white p-6 rounded shadow w-96">
                        <h2 className="text-xl font-bold mb-4">✏️ Editar Usuario</h2>
                        <input
                            type="text"
                            value={editingUser.username}
                            onChange={(e) =>
                                setEditingUser({ ...editingUser, username: e.target.value })
                            }
                            placeholder="Nombre"
                            className="w-full border p-2 mb-2"
                        />
                        <input
                            type="email"
                            value={editingUser.email}
                            onChange={(e) =>
                                setEditingUser({ ...editingUser, email: e.target.value })
                            }
                            placeholder="Correo"
                            className="w-full border p-2 mb-2"
                        />
                        <input
                            type="password"
                            onChange={(e) =>
                                setEditingUser({ ...editingUser, password: e.target.value })
                            }
                            placeholder="Nueva contraseña (opcional)"
                            className="w-full border p-2 mb-2"
                        />
                        <button
                            onClick={handleSave}
                            className="bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Guardar
                        </button>
                        <button
                            onClick={() => setEditingUser(null)}
                            className="ml-2 bg-gray-400 text-white px-4 py-2 rounded"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
