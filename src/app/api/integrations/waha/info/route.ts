import { NextResponse } from 'next/server';

/**
 * Menyediakan informasi status konfigurasi WAHA tanpa membocorkan nilai sensitif.
 */
export async function GET() {
  const url = process.env.WAHA_INTERNAL_URL;
  const key = process.env.WAHA_API_KEY;

  const urlSet = !!url && url.trim() !== '';
  const keySet = !!key && key.trim() !== '';

  const info = {
    configured: urlSet && keySet,
    urlSet,
    keySet,
    keyLength: keySet ? key!.trim().length : 0,
  };

  return NextResponse.json(info);
}
