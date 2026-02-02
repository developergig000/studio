import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * API Route to act as a secure proxy for the WAHA (WhatsApp HTTP API) service.
 *
 * Why use a proxy?
 * 1.  Security: It keeps the WAHA_API_KEY completely on the server-side, preventing it
 *     from being exposed in the client-side browser.
 * 2.  CORS Mitigation: It bypasses potential Cross-Origin Resource Sharing (CORS) issues
 *     that can occur when a browser tries to directly call an external API.
 * 3.  Centralized Control: It allows for centralized logging, header manipulation,
 *     and potential caching in the future.
 *
 * How it works:
 * - It captures all requests made to `/api/waha/...`.
 * - It reads the `WAHA_API_URL` and `WAHA_API_KEY` from environment variables.
 * - It reconstructs the target URL and forwards the request (GET, POST, etc.) along
 *   with the original body and headers.
 * - It securely adds the `X-Api-Key` header for authentication with the WAHA service.
 * - It streams the response from WAHA directly back to the original client.
 */
async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const { path } = params;

  // Retrieve WAHA configuration from environment variables.
  const wahaApiUrl = process.env.WAHA_API_URL;
  const wahaApiKey = process.env.WAHA_API_KEY;

  if (!wahaApiUrl || !wahaApiKey) {
    return NextResponse.json(
      {
        message:
          'WAHA configuration is missing. Please set WAHA_API_URL and WAHA_API_KEY in your .env.local file.',
      },
      { status: 500 }
    );
  }

  try {
    // Construct the full target URL to the actual WAHA service.
    const targetUrl = `${wahaApiUrl}/${path.join('/')}`;

    const headers = new Headers(req.headers);
    // Add the required API key for WAHA. This is kept on the server and never exposed to the client.
    headers.set('X-Api-Key', wahaApiKey);
    // Remove host header to avoid conflicts.
    headers.delete('host');


    // Forward the request to the WAHA service.
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      // Pass the body along for POST, PUT, etc. requests.
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // Important for streaming responses and ensuring proper body handling.
      redirect: 'follow',
      // @ts-ignore
      duplex: 'half',
    });

    // Return the response from the WAHA service directly to the client.
    return response;

  } catch (error: any) {
    console.error('WAHA Proxy Error:', error);
    return NextResponse.json(
      { message: 'An internal error occurred while proxying the request to WAHA.', error: error.message },
      { status: 502 } // Bad Gateway
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
