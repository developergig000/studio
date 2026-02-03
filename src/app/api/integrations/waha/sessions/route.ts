import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

/**
 * Endpoint untuk mengambil daftar semua sesi yang aktif dari layanan WAHA.
 * Ini memungkinkan dasbor untuk menampilkan status real-time.
 */
export async function GET() {
  const response = await wahaRequest({
    path: '/api/sessions',
    hint: 'Failed to fetch sessions from WAHA service.',
  });

  const httpStatus = response.status === 500 ? 500 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
