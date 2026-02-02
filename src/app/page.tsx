'use client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
    } else if (user.role) {
      if (user.role === 'HEAD_SALES') {
        router.replace('/dashboard/head');
      } else if (user.role === 'SALES') {
        router.replace('/dashboard/sales');
      } else {
        signOut();
        router.replace('/login');
      }
    } else {
      signOut();
      router.replace('/login');
    }
  }, [user, loading, router, signOut]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
