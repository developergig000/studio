import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

/**
 * Endpoint untuk memeriksa status kesehatan layanan WAHA.
 * Mencoba '/api/health', dan jika gagal (404), akan mencoba '/health'.
 */
export async function GET() {
  // Coba endpoint health check yang umum pertama.
  let response = await wahaRequest({ path: '/api/health' });

  // Jika tidak ditemukan (404), coba alternatifnya.
  if (!response.ok && response.status === 404) {
    const originalHint = response.hint || 'Endpoint /api/health not found.';
    response = await wahaRequest({
      path: '/health',
      hint: `${originalHint} Trying /health as a fallback.`,
    });
  }

  // Mengembalikan status 200 jika permintaan berhasil diproses,
  // meskipun layanan WAHA mengembalikan status error (mis. 401, 404).
  // Status 500 hanya untuk kesalahan internal yang tak terduga.
  const httpStatus = response.status === 500 ? 500 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
