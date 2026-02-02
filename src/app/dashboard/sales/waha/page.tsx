'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Power, ScanQrCode } from 'lucide-react';

type SessionStatus = 'disconnected' | 'loading' | 'qrcode' | 'connected';

export default function WahaSessionPage() {
  const [status, setStatus] = React.useState<SessionStatus>('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);

  const handleStartSession = () => {
    setStatus('loading');
    // Simulate API call to get QR code
    setTimeout(() => {
      // In a real app, this URL would come from the WAHA API
      setQrCodeUrl('https://picsum.photos/seed/waha-qr/288/288');
      setStatus('qrcode');

      // Simulate user scanning the QR code and session connecting
      const connectionTimeout = setTimeout(() => {
        setQrCodeUrl(null);
        setStatus('connected');
      }, 15000); // 15 seconds to "scan"

      // This is a cleanup function for the timeout, in case the user navigates away or cancels
      return () => clearTimeout(connectionTimeout);
    }, 2000);
  };

  const handleLogoutSession = () => {
    setStatus('disconnected');
    setQrCodeUrl(null);
  };

  const renderStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Terhubung</Badge>;
      case 'loading':
        return <Badge variant="secondary">Memuat...</Badge>;
      case 'qrcode':
        return <Badge variant="secondary">Menunggu Pindai</Badge>;
      case 'disconnected':
      default:
        return <Badge variant="destructive">Terputus</Badge>;
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-72">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p>Memulai sesi dan mengambil QR code...</p>
          </div>
        );
      case 'qrcode':
        return (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-72">
            {qrCodeUrl ? (
              <Image
                src={qrCodeUrl}
                alt="Pindai QR Code ini dengan aplikasi WhatsApp Anda"
                width={288}
                height={288}
                className="rounded-lg border p-2"
              />
            ) : null}
            <p className="mt-4 font-semibold">Pindai QR Code dengan WhatsApp</p>
            <p className="text-sm">Buka WhatsApp di ponsel Anda, buka Pengaturan &gt; Perangkat Tertaut &gt; Tautkan Perangkat.</p>
          </div>
        );
      case 'connected':
         return (
          <div className="flex flex-col items-center justify-center text-center text-green-600 h-72">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2 mb-4"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
            <p className="text-lg font-bold">Sesi WhatsApp Terhubung!</p>
            <p className="text-sm text-muted-foreground">Anda sekarang dapat menggunakan fitur yang terintegrasi dengan WhatsApp.</p>
          </div>
        );
      case 'disconnected':
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-72">
             <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-power-off mb-4"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/><path d="M12 2v10"/></svg>
            <p className="text-lg font-medium">Sesi WhatsApp Terputus</p>
            <p className="text-sm">Klik "Mulai Sesi" untuk menghasilkan QR code dan menghubungkan perangkat Anda.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex justify-center">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-2xl">Integrasi Sesi WhatsApp (WAHA)</CardTitle>
                        <CardDescription>Hubungkan akun WhatsApp Anda untuk mengaktifkan fitur terkait.</CardDescription>
                    </div>
                    {renderStatusBadge()}
                </div>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {status === 'disconnected' && (
                    <Button onClick={handleStartSession}>
                        <ScanQrCode className="mr-2" /> Mulai Sesi
                    </Button>
                )}
                 {(status === 'qrcode' || status === 'loading') && (
                    <Button variant="destructive" onClick={handleLogoutSession}>
                        <Power className="mr-2" /> Batalkan
                    </Button>
                )}
                {status === 'connected' && (
                    <Button variant="destructive" onClick={handleLogoutSession}>
                        <Power className="mr-2" /> Putuskan Sesi
                    </Button>
                )}
            </CardFooter>
        </Card>
    </div>
  );
}
