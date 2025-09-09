'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const publicRoutes = ['/login'];
    const token = localStorage.getItem('token');

    if (!token && !publicRoutes.includes(pathname)) {
        alert('⚠️ No has iniciado sesión. Por favor inicia sesión para continuar.');
      router.replace('/login');
    }
  }, [pathname, router]);

  return <>{children}</>;
}
