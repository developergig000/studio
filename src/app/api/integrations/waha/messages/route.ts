import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

/**
 * Endpoint to fetch messages for a specific chat within a WAHA session.
 * Requires 'sessionName' and 'chatId' as query parameters.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionName = searchParams.get('sessionName');
  const chatId = searchParams.get('chatId');

  if (!sessionName || !chatId) {
    return NextResponse.json(
      { ok: false, hint: 'sessionName and chatId query parameters are required.' },
      { status: 400 }
    );
  }

  // WAHA API endpoint to get messages. This might need adjustments.
  // It may also support query parameters like 'limit'.
  const response = await wahaRequest({
    path: `/api/sessions/${sessionName}/chats/${chatId}/messages?limit=50`,
    hint: `Failed to fetch messages for chat '${chatId}' in session '${sessionName}'.`,
  });

  const httpStatus = response.status === 500 ? 500 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
