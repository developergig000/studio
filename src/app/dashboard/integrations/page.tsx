'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Plug,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Tipe data untuk status konfigurasi
type WahaInfo = {
  configured: boolean;
  urlSet: boolean;
  keySet: boolean;
  keyLength: number;
};

// Tipe data untuk hasil health check
type HealthResult = {
  ok: boolean;
  status: number;
  targetUrl: string;
  data?: any;
  hint?: string;
};

function StatusBadge({ isSet, label }: { isSet: boolean; label: string }) {
  return (
    <Badge variant={isSet ? 'default' : 'destructive'} className="text-xs">
      {isSet ? `TERPASANG` : `BELUM DIATUR`} - {label}
    </Badge>
  );
}

export default function IntegrationsPage() {
  const [info, setInfo] = React.useState<WahaInfo | null>(null);
  const [healthResult, setHealthResult] = React.useState<HealthResult | null>(
    null
  );
  const [isInfoLoading, setIsInfoLoading] = React.useState(true);
  const [isHealthLoading, setIsHealthLoading] = React.useState(false);

  React.useEffect(() => {
    async function fetchInfo() {
      try {
        const response = await fetch('/api/integrations/waha/info');
        if (response.ok) {
          const data = await response.json();
          setInfo(data);
        }
      } catch (error) {
        // Error handling is done by checking the 'info' state
      } finally {
        setIsInfoLoading(false);
      }
    }
    fetchInfo();
  }, []);

  const handleTestConnection = async () => {
    setIsHealthLoading(true);
    setHealthResult(null);
    try {
      const response = await fetch('/api/integrations/waha/health');
      const data: HealthResult = await response.json();
      setHealthResult(data);
    } catch (error) {
      const fetchErrorResult: HealthResult = {
        ok: false,
        status: 500,
        targetUrl: 'N/A',
        hint: 'Gagal menghubungi server aplikasi. Periksa koneksi internet Anda atau log server.',
      };
      setHealthResult(fetchErrorResult);
    } finally {
      setIsHealthLoading(false);
    }
  };

  const renderHealthStatus = () => {
    if (!healthResult) return null;

    if (healthResult.ok) {
      return (
        <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
          <div>
            <p className="font-semibold">Koneksi Berhasil</p>
            <p className="text-sm">
              Layanan WAHA merespons dengan status{' '}
              <Badge variant="secondary">{healthResult.status}</Badge> dari{' '}
              <code className="text-xs">{healthResult.targetUrl}</code>.
            </p>
          </div>
        </div>
      );
    }

    // Handle specific 401 error
    if (healthResult.status === 401) {
      return (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Koneksi Ditolak (401 Unauthorized)</p>
            <p className="text-sm">
              Ini biasanya terjadi karena `WAHA_API_KEY` di file `.env.local`
              salah atau tidak valid. Pastikan juga `WAHA_INTERNAL_URL` bukan
              alamat preview `cloudworkstations.dev`.
            </p>
            <p className="mt-1 text-xs text-red-600">
              Target: {healthResult.targetUrl}
            </p>
          </div>
        </div>
      );
    }

    // Handle other errors
    return (
      <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
        <div>
          <p className="font-semibold">
            Koneksi Gagal (Status: {healthResult.status})
          </p>
          <p className="text-sm">
            {healthResult.hint ||
              'Layanan WAHA tidak merespons seperti yang diharapkan.'}
          </p>
          <p className="mt-1 text-xs text-yellow-600">
            Target: {healthResult.targetUrl}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl font-semibold tracking-tight">
          Integrasi Sistem
        </h1>
        <p className="text-muted-foreground">
          Kelola dan uji koneksi ke layanan eksternal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Plug className="h-6 w-6" />
            <CardTitle>WAHA (WhatsApp HTTP API)</CardTitle>
          </div>
          <CardDescription>
            Uji konektivitas ke layanan WAHA Anda. Konfigurasi diambil dari
            file `.env.local` di server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Status Konfigurasi
            </h3>
            {isInfoLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-28" />
              </div>
            ) : info ? (
              <div className="flex flex-wrap gap-2">
                <StatusBadge isSet={info.urlSet} label="URL" />
                <StatusBadge isSet={info.keySet} label="API Key" />
                {info.keySet && (
                  <Badge variant="secondary" className="text-xs">
                    Panjang Kunci: {info.keyLength}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-destructive">
                Gagal memuat status konfigurasi.
              </p>
            )}
          </div>
          <Button
            onClick={handleTestConnection}
            disabled={isHealthLoading || isInfoLoading || !info?.configured}
          >
            {isHealthLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plug className="mr-2 h-4 w-4" />
            )}
            Test Koneksi
          </Button>
          <div className="min-h-[90px] w-full">{renderHealthStatus()}</div>
        </CardContent>
      </Card>

      {healthResult && (
        <Card>
          <CardHeader>
            <CardTitle>Log Respons</CardTitle>
            <CardDescription>
              Respons mentah (raw) dari hasil tes koneksi terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="w-full overflow-x-auto rounded-md bg-muted p-4 text-xs text-muted-foreground">
              {JSON.stringify(healthResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
