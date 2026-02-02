'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Server, CheckCircle, XCircle, UserCheck, Plug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';


export default function IntegrationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wahaStatus, setWahaStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [wahaErrorMessage, setWahaErrorMessage] = React.useState<string | null>(null);

  const handlePingWaha = async () => {
    setWahaStatus('loading');
    setWahaErrorMessage(null);

    try {
      // We now call our own secure proxy endpoint
      const response = await fetch('/api/waha/health');
      
      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = await response.text();
        }
        throw new Error(errorData.message || `Service responded with status ${response.status}`);
      }
      
      setWahaStatus('success');

    } catch (error: any) {
      setWahaStatus('error');
      let message = 'Gagal terhubung ke layanan WAHA. Pastikan URL dan API Key di .env.local sudah benar dan layanan WAHA sedang berjalan.';
      if (error.message) {
        message = error.message;
      }
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        message = `Gagal melakukan fetch ke proxy API. Pastikan aplikasi Next.js berjalan dengan benar.`;
      }
      setWahaErrorMessage(message);
      console.error("WAHA Ping Error:", error);
    }
  };

  const renderWahaStatus = () => {
    switch (wahaStatus) {
      case 'loading':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Mencoba menghubungkan ke layanan WAHA...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Koneksi ke layanan WAHA berhasil.</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col gap-2 text-destructive">
            <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span>Koneksi ke layanan WAHA gagal.</span>
            </div>
            <p className="text-xs bg-destructive/10 p-2 rounded-md">{wahaErrorMessage}</p>
          </div>
        );
      case 'idle':
      default:
        return <p className="text-sm text-muted-foreground">Klik tombol untuk menguji koneksi ke layanan WAHA.</p>;
    }
  };


  return (
    <div className="flex flex-col gap-6">
       <div className="space-y-1">
         <h1 className="font-headline text-2xl font-semibold tracking-tight">System Integration Status</h1>
         <p className="text-muted-foreground">Check the connection status to external services.</p>
       </div>
        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <UserCheck className="h-6 w-6" />
                    <CardTitle>Authentication Service</CardTitle>
                </div>
                <CardDescription>
                    Checks if you are correctly authenticated with the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {user ? (
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Authenticated</Badge>
                        <span className="text-sm text-muted-foreground">Logged in as {user.email}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="destructive">Not Authenticated</Badge>
                        <span className="text-sm text-muted-foreground">No user is currently logged in.</span>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <Server className="h-6 w-6" />
                    <CardTitle>WAHA Service</CardTitle>
                </div>
                <CardDescription>
                   Performs a real-time test to ensure the WAHA (WhatsApp HTTP API) service is reachable via a secure proxy. Credentials are managed via .env.local.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handlePingWaha} disabled={wahaStatus === 'loading'}>
                    {wahaStatus === 'loading' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Plug className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                </Button>
                <div className="rounded-lg border p-4 min-h-[60px] flex items-center">
                    {renderWahaStatus()}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
