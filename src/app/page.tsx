'use client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { routeUsersBasedOnRole } from '@/ai/flows/route-users-based-on-role';
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
      routeUsersBasedOnRole({ role: user.role })
        .then(({ route }) => {
          if (route) {
            router.replace(route);
          } else {
            console.error("AI couldn't determine route. Logging out.");
            signOut();
            router.replace('/login');
          }
        })
        .catch(error => {
          console.error('Error with AI routing:', error);
          signOut();
          router.replace('/login');
        });
    }
  }, [user, loading, router, signOut]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
