'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Loader2, Power, PowerOff, LogOut, CheckCircle, XCircle, Smartphone, QrCodeIcon } from 'lucide-react';

import { db } from '@/lib/firebase/client';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function getInitials(name?: string | null) {
  return name?.split(' ').map((n) => n[0]).join('') || 'U';
}

function UserWahaSessionCard({ user }: { user: User }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAction = async (action: 'start' | 'stop' | 'logout') => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/integrations/waha/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: user.uid,
          sessionName: user.wahaSessionName,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.hint || 'Failed to perform WAHA action.');
      }
      
      // The API call to WAHA was successful. Now, update Firestore based on the action.
      // The actual status change (e.g., to 'connected') should ideally be handled by a webhook from WAHA.
      // Here, we optimistically update the UI.
      const userRef = doc(db, 'users', user.uid);
      if (action === 'start') {
        const wahaData = result.data;
        if (wahaData?.status === 'qrcode' && wahaData?.qrcode?.qr) {
          await updateDoc(userRef, {
            wahaSessionName: wahaData.name,
            wahaStatus: 'qrcode',
            wahaQrCode: wahaData.qrcode.qr,
          });
          toast({ title: 'Session Starting', description: 'Please scan the QR code with WhatsApp.' });
        }
      } else if (action === 'stop' || action === 'logout') {
        await updateDoc(userRef, {
          wahaStatus: 'disconnected',
          wahaQrCode: null,
          wahaPhoneNumber: null,
        });
        toast({ title: `Session ${action === 'stop' ? 'Stopped' : 'Logged Out'}` });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const status = user.wahaStatus || 'disconnected';

  const statusConfig = {
    disconnected: {
      Icon: XCircle,
      color: 'bg-destructive',
      text: 'Disconnected',
    },
    loading: {
      Icon: Loader2,
      color: 'bg-yellow-500 animate-spin',
      text: 'Loading...',
    },
    qrcode: {
      Icon: QrCodeIcon,
      color: 'bg-blue-500',
      text: 'Awaiting QR Scan',
    },
    connected: {
      Icon: CheckCircle,
      color: 'bg-green-500',
      text: 'Connected',
    },
  };

  const { Icon, color, text } = statusConfig[status];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full", color)} />
                <span className="text-sm font-medium">{text}</span>
            </div>
            {user.wahaPhoneNumber && status === 'connected' && (
                <Badge variant="secondary">{user.wahaPhoneNumber}</Badge>
            )}
        </div>
        
        {status === 'qrcode' && user.wahaQrCode ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-muted p-4">
                <p className="mb-2 text-center text-sm text-muted-foreground">Scan with WhatsApp on your phone</p>
                <Image src={user.wahaQrCode} alt="WhatsApp QR Code" width={256} height={256} className="rounded-md" />
            </div>
        ) : null}

        {error && (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        {status === 'disconnected' ? (
          <Button onClick={() => handleAction('start')} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="animate-spin" /> : <Power />} Start Session
          </Button>
        ) : (
            <>
                <Button onClick={() => handleAction('stop')} disabled={isLoading} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : <PowerOff />} Stop
                </Button>
                 <Button onClick={() => handleAction('logout')} disabled={isLoading} variant="destructive" className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : <LogOut />} Logout
                </Button>
            </>
        )}
      </CardFooter>
    </Card>
  );
}


export default function WahaSessionsPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'SALES'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const usersData = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        } as User));
        setUsers(usersData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        toast({
            variant: 'destructive',
            title: 'Failed to load users',
            description: error.message
        });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">
          WAHA Session Management
        </h1>
        <p className="text-muted-foreground">
          Monitor and manage WhatsApp sessions for all SALES users.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>No SALES Users Found</AlertTitle>
            <AlertDescription>
                There are no users with the 'SALES' role to manage. You can add them in the User Management page.
            </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <UserWahaSessionCard key={user.uid} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
