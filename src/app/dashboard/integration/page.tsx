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
        let errorMessage;
        try {
          // Try to parse the error response as JSON
          errorData = await response.json();
          // The proxy sends a detailed `error` field, let's prioritize that.
          errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          // If JSON parsing fails, it might be plain text
          try {
            errorMessage = await response.text();
          } catch (textError) {
             errorMessage = `Service responded with status ${response.status} but failed to parse error response.`;
          }
        }
        
        const finalMessage = errorMessage || `An unknown error occurred. Status: ${response.status}`;
        
        setWahaStatus('error');
        setWahaErrorMessage(finalMessage);
        return; // Stop execution
      }
      
      setWahaStatus('success');

    } catch (error: any) {
      setWahaStatus('error');
      let message = 'Gagal terhubung ke proxy API. Periksa koneksi internet Anda dan pastikan server aplikasi berjalan.';
      
      if (error.message) {
        // This will typically catch network errors like 'Failed to fetch'
        message = `Gagal melakukan fetch ke proxy API: ${error.message}.`;
      }
      setWahaErrorMessage(message);
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
                   Performs a real-time test to ensure the WAHA (WhatsApp HTTP API) service is reachable via a secure proxy. Credentials are managed via .env or .env.local.
                </CardDescription>
            </Header>
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
