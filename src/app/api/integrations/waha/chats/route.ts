import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

/**
 * Endpoint to fetch the list of chats for a specific WAHA session.
 * Requires 'sessionName' as a query parameter.
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

  // WAHA API endpoint to get chats for a session.
  // This might vary depending on the WAHA fork, but `/api/sessions/${sessionName}/chats` is a common pattern.
  const response = await wahaRequest({
    path: `/api/sessions/${sessionName}/chats`,
    hint: `Failed to fetch chats for session '${sessionName}'.`,
  });

  const httpStatus = response.status === 500 ? 500 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
