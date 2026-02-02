import { NextResponse } from 'next/server';

/**
 * A simple health check endpoint.
 * It responds with a 200 OK status and a JSON body to indicate the service is running.
 * This is used by the integration page to demonstrate a successful API connection test.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
