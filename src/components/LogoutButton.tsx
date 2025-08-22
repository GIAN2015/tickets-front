"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Aquí borras el token de autenticación (localStorage, cookies, etc.)
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className=" px-3 py-1 rounded text-white hover:underline  transition-colors"
    >
      Cerrar sesión
    </button>
  );
}
