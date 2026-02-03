import { NextResponse } from 'next/server';
import { wahaRequest } from '@/lib/wahaClient';

// This is a simplified server-side session check.
// In a production app, use Firebase Admin SDK to verify an ID token passed from the client.
function isHeadSalesRequest(request: Request): boolean {
  // For now, we'll trust a custom header. THIS IS NOT SECURE FOR PRODUCTION.
  return request.headers.get('X-User-Role') === 'HEAD_SALES';
}

export async function POST(request: Request) {
  // In a real app, you would verify the user's token here.
  // We're skipping proper auth for this example to keep it simple.

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ hint: 'Invalid JSON body' }, { status: 400 });
  }
  
  const { action, userId, sessionName } = body;

  if (!action) {
    return NextResponse.json({ hint: 'Action is required' }, { status: 400 });
  }

  try {
    let response;
    switch (action) {
      case 'start':
        if (!userId) {
          return NextResponse.json({ hint: 'userId is required for start action' }, { status: 400 });
        }
        const newSessionName = `session-${userId}`;
        response = await wahaRequest({
          path: '/api/sessions/start',
          method: 'POST',
          body: { name: newSessionName },
        });
        break;
      
      case 'stop':
        if (!sessionName) {
            return NextResponse.json({ hint: 'sessionName is required for stop action' }, { status: 400 });
        }
        response = await wahaRequest({
            path: `/api/sessions/${sessionName}/stop`,
            method: 'POST',
        });
        break;

      case 'logout':
        if (!sessionName) {
            return NextResponse.json({ hint: 'sessionName is required for logout action' }, { status: 400 });
        }
        response = await wahaRequest({
            path: `/api/sessions/${sessionName}/logout`,
            method: 'POST',
        });
        break;
      
      default:
        return NextResponse.json({ hint: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(response, { status: response.ok ? 200 : 400 });

  } catch (error: any) {
    return NextResponse.json(
      { hint: 'An internal server error occurred.', error: error.message },
      { status: 500 }
    );
  }
}
