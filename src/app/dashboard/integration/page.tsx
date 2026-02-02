'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Server, CheckCircle, XCircle, UserCheck, Plug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


export default function IntegrationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wahaStatus, setWahaStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [wahaUrl, setWahaUrl] = React.useState('/api/health'); // Default to internal health check for demo
  const [wahaErrorMessage, setWahaErrorMessage] = React.useState<string | null>(null);

  const handlePingWaha = async () => {
    if (!wahaUrl) {
        toast({
            variant: 'destructive',
            title: 'URL Diperlukan',
            description: 'Silakan masukkan URL layanan WAHA untuk diuji.',
        });
        return;
    }

    setWahaStatus('loading');
    setWahaErrorMessage(null);

    try {
      const response = await fetch(wahaUrl);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Service responded with status ${response.status}: ${errorData || 'No additional details'}`);
      }
      
      // You might want to check the response body for a specific "ok" message
      // const data = await response.json();

      setWahaStatus('success');

    } catch (error: any) {
      setWahaStatus('error');
      let message = 'Gagal terhubung ke layanan WAHA. Periksa URL dan pastikan layanan sedang berjalan.';
      if (error.message) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }
      // Specific error for network failure
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        message = `Gagal melakukan fetch ke ${wahaUrl}. Ini mungkin disebabkan oleh masalah CORS, jaringan, atau DNS. Pastikan URL dapat diakses dari browser.`;
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
            <span>Mencoba menghubungkan ke {wahaUrl}...</span>
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
        return <p className="text-sm text-muted-foreground">Masukkan URL dan klik tombol untuk menguji koneksi ke layanan WAHA.</p>;
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
                   Performs a real-time test to ensure the WAHA (WhatsApp HTTP API) service is reachable.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="waha-url">WAHA Service URL</Label>
                    <Input 
                        id="waha-url" 
                        placeholder="http://your-waha-service.com/health" 
                        value={wahaUrl}
                        onChange={(e) => setWahaUrl(e.target.value)}
                    />
                </div>
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
