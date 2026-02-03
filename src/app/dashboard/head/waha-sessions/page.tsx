'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Loader2, Power, PowerOff, LogOut, CheckCircle, XCircle, Smartphone, QrCodeIcon, AlertTriangle } from 'lucide-react';

import { db } from '@/lib/firebase/client';
import type { User, WahaSessionStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { WahaApiResponse } from '@/lib/wahaClient';

// --- Helper Functions and Types ---

function getInitials(name?: string | null) {
  return name?.split(' ').map((n) => n[0]).join('') || 'U';
}

type WahaSession = {
  name: string;
  status: WahaSessionStatus | string; // Allow for unexpected string statuses
  pushName?: string;
  me?: {
    user: string;
  }
};

type MergedUser = User & {
  liveWahaStatus: WahaSessionStatus;
  liveWahaPhoneNumber?: string | null;
};

// Normalize WAHA status to a known set of values
function normalizeWahaStatus(status: string | undefined): WahaSessionStatus {
    if (!status) return 'disconnected';
    const lowerCaseStatus = status.toLowerCase();
    
    if (lowerCaseStatus.includes('connected')) return 'connected';
    if (lowerCaseStatus.includes('qrcode')) return 'qrcode';
    if (lowerCaseStatus.includes('loading') || lowerCaseStatus.includes('starting')) return 'loading';
    
    return 'disconnected';
}


// --- Child Component: UserWahaSessionCard ---

function UserWahaSessionCard({ user, onAction, isActionLoading }: { user: MergedUser; onAction: (userId: string, sessionName: string | undefined, action: 'start' | 'stop' | 'logout') => void; isActionLoading: boolean; }) {
  
  const statusConfig = {
    disconnected: { Icon: XCircle, color: 'bg-destructive', text: 'Terputus' },
    loading: { Icon: Loader2, color: 'bg-yellow-500 animate-spin', text: 'Memuat...' },
    qrcode: { Icon: QrCodeIcon, color: 'bg-blue-500', text: 'Tunggu Pindai QR' },
    connected: { Icon: CheckCircle, color: 'bg-green-500', text: 'Terhubung' },
  };

  const status = user.liveWahaStatus;
  // Fallback to disconnected if status is not in config
  const { Icon, color, text } = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;

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
          {/* Display phone number from Firestore user data, which can be manually set or synced */}
          {user.wahaPhoneNumber && (
            <Badge variant="secondary">{user.wahaPhoneNumber}</Badge>
          )}
        </div>
        
        {status === 'qrcode' && user.wahaQrCode ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-muted p-4">
            <p className="mb-2 text-center text-sm text-muted-foreground">Pindai dengan WhatsApp di ponsel Anda</p>
            <Image src={user.wahaQrCode} alt="WhatsApp QR Code" width={256} height={256} className="rounded-md" />
          </div>
        ) : null}

      </CardContent>
      <CardFooter className="flex gap-2">
        {status === 'disconnected' ? (
          <Button onClick={() => onAction(user.uid, user.wahaSessionName, 'start')} disabled={isActionLoading} className="w-full">
            {isActionLoading ? <Loader2 className="animate-spin" /> : <Power />} Mulai Sesi
          </Button>
        ) : (
          <>
            <Button onClick={() => onAction(user.uid, user.wahaSessionName, 'stop')} disabled={isActionLoading} variant="outline" className="w-full">
              {isActionLoading ? <Loader2 className="animate-spin" /> : <PowerOff />} Berhenti
            </Button>
             <Button onClick={() => onAction(user.uid, user.wahaSessionName, 'logout')} disabled={isActionLoading} variant="destructive" className="w-full">
              {isActionLoading ? <Loader2 className="animate-spin" /> : <LogOut />} Logout
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

// --- Main Page Component: WahaSessionsPage ---

export default function WahaSessionsPage() {
  const [salesUsers, setSalesUsers] = React.useState<User[]>([]);
  const [liveSessions, setLiveSessions] = React.useState<WahaSession[]>([]);
  const [isUsersLoading, setIsUsersLoading] = React.useState(true);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Effect 1: Fetch SALES users from Firestore
  React.useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'SALES'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const usersData = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        } as User));
        setSalesUsers(usersData);
        setIsUsersLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal memuat pengguna',
            description: error.message
        });
        setIsUsersLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  // Effect 2: Poll WAHA for live session statuses
  React.useEffect(() => {
    const fetchLiveSessions = async () => {
      try {
        const response = await fetch('/api/integrations/waha/sessions');
        const result: WahaApiResponse = await response.json();
        
        if (result.ok && Array.isArray(result.data)) {
          setLiveSessions(result.data);
          setApiError(null);
        } else {
          setApiError(result.hint || 'Gagal mengambil data sesi dari WAHA.');
        }
      } catch (err) {
        setApiError('Tidak dapat terhubung ke server aplikasi untuk mendapatkan status WAHA.');
      }
    };

    fetchLiveSessions(); // Initial fetch
    const intervalId = setInterval(fetchLiveSessions, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Action Handler
  const handleAction = async (userId: string, sessionName: string | undefined, action: 'start' | 'stop' | 'logout') => {
    setIsActionLoading(true);

    try {
      const res = await fetch('/api/integrations/waha/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          sessionName: sessionName || `session-${userId}`,
        }),
      });

      const result: WahaApiResponse = await res.json();
      
      if (!result.ok) {
        throw new Error(result.hint || 'Gagal melakukan aksi WAHA.');
      }
      
      const userRef = doc(db, 'users', userId);

      if (action === 'start') {
        const wahaData = result.data;
        const newSessionName = wahaData.name;

        // Update Firestore with session name and QR code if available
        await setDoc(userRef, {
            wahaSessionName: newSessionName,
            wahaStatus: 'qrcode', // Optimistically set to qrcode
            wahaQrCode: wahaData.qrcode?.qr,
          }, { merge: true });
        
        toast({ title: 'Sesi Dimulai', description: 'Silakan pindai kode QR dengan WhatsApp.' });
      } else {
        // For stop/logout, also clear the QR code and reset status. Do NOT clear phone number.
        await updateDoc(userRef, { wahaQrCode: null, wahaStatus: 'disconnected' });
        toast({ title: `Sesi ${action === 'stop' ? 'Dihentikan' : 'Logout'}` });
      }

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Aksi Gagal', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Memoized derived state: merge Firestore users with live WAHA sessions
  const displayUsers = React.useMemo((): MergedUser[] => {
    return salesUsers.map(user => {
      const sessionName = user.wahaSessionName || `session-${user.uid}`;
      const liveSession = liveSessions.find(s => s.name === sessionName);
      
      let liveWahaStatus = normalizeWahaStatus(liveSession?.status);

      // This logic ensures that if we are waiting for a QR scan, we keep showing it
      // even if the live session hasn't appeared yet.
      if (liveWahaStatus === 'disconnected' && user.wahaStatus === 'qrcode') {
        liveWahaStatus = 'qrcode';
      }
      
      const livePhoneNumber = normalizeWahaStatus(liveSession?.status) === 'connected' 
        ? (liveSession?.pushName || liveSession?.me?.user) 
        : null;

      return {
        ...user,
        liveWahaStatus,
        liveWahaPhoneNumber: livePhoneNumber,
      };
    });
  }, [salesUsers, liveSessions]);
  
  // Effect 3: Sync live phone numbers back to Firestore
  React.useEffect(() => {
    displayUsers.forEach(user => {
      // `liveNumber` is the fresh data from the WAHA API call. It's either a string or null.
      const liveNumber = user.liveWahaPhoneNumber;
      // `storedNumber` is the data currently in Firestore. It can be a string or null/undefined.
      const storedNumber = user.wahaPhoneNumber;

      // THE CRITICAL LOGIC:
      // Only update Firestore IF...
      // 1. We have a valid, non-empty `liveNumber` from WAHA.
      // 2. The `liveNumber` is different from what's already stored.
      // This prevents a `null` or empty `liveNumber` (from a disconnected session)
      // from overwriting a valid number that was entered manually or previously synced.
      if (liveNumber && liveNumber.trim() !== '' && liveNumber !== storedNumber) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, { wahaPhoneNumber: liveNumber });
      }
    });
  }, [displayUsers]);


  const isLoading = isUsersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">
          Manajemen Sesi WAHA
        </h1>
        <p className="text-muted-foreground">
          Pantau dan kelola sesi WhatsApp untuk semua pengguna SALES secara real-time.
        </p>
      </div>
      
      {apiError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Koneksi WAHA</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
      )}

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
      ) : displayUsers.length === 0 ? (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertTitle>Tidak Ada Pengguna SALES</AlertTitle>
          <AlertDescription>
            Tidak ada pengguna dengan peran 'SALES' untuk dikelola. Anda dapat menambahkan mereka di halaman Manajemen Pengguna.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayUsers.map((user) => (
            <UserWahaSessionCard key={user.uid} user={user} onAction={handleAction} isActionLoading={isActionLoading} />
          ))}
        </div>
      )}
    </div>
  );
}
