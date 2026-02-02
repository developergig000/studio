'use client';

import * as React from 'react';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Power, ScanQrCode, Save, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

type SessionStatus = 'disconnected' | 'loading' | 'qrcode' | 'connected';

function getInitials(name?: string | null) {
  return name?.split(' ').map((n) => n[0]).join('') || 'U';
}

function UserSessionCard({ user, onUpdate }: { user: User; onUpdate: (userId: string, data: Partial<User>) => Promise<void> }) {
  const { toast } = useToast();
  const [sessionName, setSessionName] = React.useState(user.wahaSessionName || '');
  const [phoneNumber, setPhoneNumber] = React.useState(user.wahaPhoneNumber || '');
  const [status, setStatus] = React.useState<SessionStatus>(user.wahaStatus || 'disconnected');
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);

  React.useEffect(() => {
    // Sync local state if props change from parent (e.g., from onSnapshot)
    setSessionName(user.wahaSessionName || '');
    setPhoneNumber(user.wahaPhoneNumber || '');
    setStatus(user.wahaStatus || 'disconnected');
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(user.uid, { wahaSessionName: sessionName, wahaPhoneNumber: phoneNumber });
      toast({ title: "Sukses", description: `Data untuk ${user.name} telah disimpan.` });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Gagal menyimpan data." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSession = () => {
    if (!sessionName || !phoneNumber) {
        toast({ variant: 'destructive', title: "Error", description: "Nama sesi dan nomor telepon harus diisi." });
        return;
    }
    setIsStarting(true);
    onUpdate(user.uid, { wahaStatus: 'loading', wahaSessionName: sessionName, wahaPhoneNumber: phoneNumber });

    // Simulate API call to get QR code
    setTimeout(() => {
      const qrUrl = `https://picsum.photos/seed/${user.uid}/288/288`;
      setQrCodeUrl(qrUrl);
      onUpdate(user.uid, { wahaStatus: 'qrcode' });
      setIsStarting(false);
      
      // Simulate connection after scan
      const connectionTimeout = setTimeout(() => {
        onUpdate(user.uid, { wahaStatus: 'connected' });
      }, 15000); // 15 seconds to "scan"
      
      return () => clearTimeout(connectionTimeout);
    }, 2000);
  };
  
  const handleStopSession = () => {
      setQrCodeUrl(null);
      onUpdate(user.uid, { wahaStatus: 'disconnected' });
  };

  const renderStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Terhubung</Badge>;
      case 'loading':
        return <Badge variant="secondary">Memuat...</Badge>;
      case 'qrcode':
        return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">Menunggu Pindai</Badge>;
      case 'disconnected':
      default:
        return <Badge variant="destructive">Terputus</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          <div className="ml-auto">{renderStatusBadge()}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`session-name-${user.uid}`}>Nama Sesi</Label>
          <Input id={`session-name-${user.uid}`} value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Contoh: sesi_nadya" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`phone-number-${user.uid}`}>Nomor WhatsApp</Label>
          <Input id={`phone-number-${user.uid}`} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Contoh: 6281234567890" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
        </div>
        <div className="flex gap-2">
          {status === 'disconnected' && (
            <Button onClick={handleStartSession} disabled={isStarting}>
              {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanQrCode className="mr-2" />}
              Mulai Sesi
            </Button>
          )}
          {status === 'qrcode' && (
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline"><QrCode className="mr-2" /> Tampilkan QR</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pindai untuk {user.name}</DialogTitle>
                        <DialogDescription>Pindai QR code ini dengan aplikasi WhatsApp Anda untuk menghubungkan sesi.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center p-4">
                        <Image src={`https://picsum.photos/seed/${user.uid}/288/288`} alt="QR Code" width={288} height={288} />
                    </div>
                </DialogContent>
            </Dialog>
          )}
          {(status === 'connected' || status === 'loading' || status === 'qrcode') && (
            <Button variant="destructive" onClick={handleStopSession}><Power className="mr-2" /> Putuskan</Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default function WahaHeadSalesPage() {
  const { user, loading: authLoading } = useAuth();
  const [salesUsers, setSalesUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) { // No need to check role here yet, wait for loading to finish
      setLoading(false);
      return;
    }

    const usersQuery = query(collection(db, 'users'), where('role', '==', 'SALES'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      setSalesUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch sales users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'HEAD_SALES') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Akses Ditolak</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Hanya Head Sales yang dapat mengakses halaman ini.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="space-y-1">
         <h1 className="font-headline text-2xl font-semibold tracking-tight">Manajemen Sesi WhatsApp</h1>
         <p className="text-muted-foreground">Kelola sesi WhatsApp untuk setiap anggota tim sales.</p>
       </div>
       {salesUsers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {salesUsers.map(salesUser => (
                <UserSessionCard key={salesUser.uid} user={salesUser} onUpdate={handleUpdateUser} />
            ))}
        </div>
       ) : (
        <Card>
            <CardContent className="p-6">
                <p>Tidak ada pengguna dengan peran "SALES" yang ditemukan.</p>
            </CardContent>
        </Card>
       )}
    </div>
  );
}
