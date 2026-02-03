'use client';

import { wahaRequest, type WahaApiResponse } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

/**
 * Endpoint to fetch the list of chats for a specific WAHA session.
 * It resiliently tries multiple common API paths to support different WAHA forks.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionName = searchParams.get('sessionName');

  if (!sessionName) {
    return NextResponse.json(
      { ok: false, hint: 'sessionName query parameter is required.' },
      { status: 400 }
    );
  }

  // Define a list of possible endpoint paths to try.
  const possiblePaths = [
    `/api/chats/${sessionName}`, // Common in some forks
    `/api/sessions/${sessionName}/chats`, // Common in others
  ];

  let lastResponse: WahaApiResponse | null = null;

  // Iterate through the possible paths and stop at the first successful one.
  for (const path of possiblePaths) {
    const response = await wahaRequest({
      path: path,
      hint: `Failed attempt at ${path}.`,
    });

    lastResponse = response;

    // If the request was successful (2xx status), we found the right endpoint.
    if (response.ok) {
      return NextResponse.json(response, { status: 200 });
    }
  }

  // If the loop completes, it means all attempts failed.
  // Return the last response we received, which contains the final error.
  const httpStatus = lastResponse?.status === 500 ? 500 : 200;
  return NextResponse.json(lastResponse, { status: httpStatus });
}
