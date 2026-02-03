// IMPORTANT: This file should only be used in server-side components and API routes.
// It contains environment variables that should not be exposed to the client.

type WahaClientOptions = {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
  hint?: string;
};

// Standardized response format for consistency
export type WahaApiResponse = {
  ok: boolean;
  status: number;
  targetUrl: string;
  data?: any;
  hint?: string;
};

/**
 * A server-side client for making secure requests to the WAHA service.
 * It handles environment variable validation, authentication, and timeouts.
 *
 * @param options - The request options including path, method, and body.
 * @returns A standardized WahaApiResponse object.
 */
export async function wahaRequest(
  options: WahaClientOptions
): Promise<WahaApiResponse> {
  const { path, method = 'GET', body, hint: initialHint } = options;

  // 1. Validate Environment Variables
  const baseURL = process.env.WAHA_INTERNAL_URL;
  const apiKey = process.env.WAHA_API_KEY;

  if (!baseURL || !apiKey) {
    const hintMessage =
      process.env.NODE_ENV === 'production'
        ? 'Konfigurasi server error: WAHA_INTERNAL_URL atau WAHA_API_KEY tidak diatur di environment hosting Anda (misalnya Vercel).'
        : 'Konfigurasi server error: WAHA_INTERNAL_URL atau WAHA_API_KEY tidak diatur di file .env Anda.';
    return {
      ok: false,
      status: 500,
      targetUrl: 'N/A',
      hint: hintMessage,
    };
  }

  const targetUrl = `${baseURL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const timeoutMs = parseInt(process.env.WAHA_TIMEOUT_MS || '15000', 10);

  // 2. Setup AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 3. Prepare and make the fetch request
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey.trim(), // Always set the API key
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal, // Connect AbortController
    });

    clearTimeout(timeoutId); // Clear timeout if request succeeds

    const responseData = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      targetUrl,
      data: responseData,
      hint: initialHint,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    let hint = 'Terjadi kesalahan saat menghubungi layanan WAHA.';
    if (error.name === 'AbortError') {
      hint = `Permintaan ke WAHA melebihi batas waktu ${timeoutMs / 1000} detik. Pastikan layanan dapat dijangkau.`;
    } else if (error.cause?.code) {
      // Common network errors
      switch (error.cause.code) {
        case 'ENOTFOUND':
          hint = `URL WAHA tidak ditemukan. Pastikan hostname di WAHA_INTERNAL_URL benar.`;
          break;
        case 'ECONNREFUSED':
          hint = `Koneksi ditolak. Pastikan layanan WAHA sedang berjalan di alamat yang benar.`;
          break;
        default:
          hint = `Kesalahan jaringan: ${error.cause.code}.`;
      }
    }

    return {
      ok: false,
      status: 500, // Indicates an internal/network error on our side
      targetUrl,
      hint,
    };
  }
}
