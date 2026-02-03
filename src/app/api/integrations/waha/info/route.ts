import { NextResponse } from 'next/server';

/**
 * Menyediakan informasi status konfigurasi WAHA tanpa membocorkan nilai sensitif.
 * Juga menambahkan peringatan jika URL yang digunakan adalah alamat pratinjau.
 */
export async function GET() {
  const url = process.env.WAHA_INTERNAL_URL || '';
  const key = process.env.WAHA_API_KEY || '';

  const urlSet = url.trim() !== '';
  const keySet = key.trim() !== '';

  let warning: string | undefined = undefined;
  if (urlSet && url.includes('cloudworkstations.dev')) {
    warning =
      'URL yang terkonfigurasi adalah alamat pratinjau Cloud Workstations. Ini dapat menyebabkan kegagalan koneksi (seperti error 401) karena pembatasan jaringan internal. Untuk koneksi server-ke-server, selalu gunakan alamat yang stabil dan dapat dijangkau dari lingkungan server Anda (misalnya, alamat IP internal atau nama layanan).';
  }

  const info = {
    configured: urlSet && keySet,
    urlSet,
    keySet,
    keyLength: keySet ? key.trim().length : 0,
    warning,
  };

  return NextResponse.json(info);
}
