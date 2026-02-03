
import { wahaRequest, type WahaApiResponse } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';
import type { WahaMessage } from '@/lib/types';

/**
 * Normalizes the response from various WAHA forks into a standard WahaMessage array.
 * @param responseData - The raw data from the WAHA API response.
 * @returns A normalized array of WahaMessage objects, or null if no valid message array is found.
 */
function normalizeMessages(responseData: any): WahaMessage[] | null {
    let rawMessages: any[] = [];

    if (Array.isArray(responseData)) {
        rawMessages = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
        rawMessages = responseData.data;
    } else if (responseData && Array.isArray(responseData.messages)) {
        rawMessages = responseData.messages;
    } else if (responseData && Array.isArray(responseData.result)) {
        rawMessages = responseData.result;
    }

    if (rawMessages.length > 0) {
        // Map to our standard WahaMessage format
        return rawMessages.map(msg => ({
            id: msg.id || msg._id || '', // Some forks use _id
            body: msg.body || msg.text || '', // some use text
            fromMe: msg.fromMe || msg.isFromMe || false,
            timestamp: msg.timestamp || 0,
            ack: msg.ack || 0,
        }));
    }

    return null;
}

/**
 * Endpoint to fetch messages for a specific chat within a WAHA session.
 * It resiliently tries multiple common API paths.
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

  // Define a list of possible endpoint paths to try. Include query params.
  const possiblePaths = [
    `/api/sessions/${sessionName}/chats/${chatId}/messages?limit=50`,
    `/api/sessions/${sessionName}/messages?chatId=${chatId}&limit=50`, // Some forks use this pattern
  ];

  let lastResponse: WahaApiResponse | null = null;

  for (const path of possiblePaths) {
    const response = await wahaRequest({
      path: path,
      hint: `Attempt failed for path: ${path}.`,
    });
    lastResponse = response;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`RAW WAHA RESPONSE (Messages, Path: ${path}):`, JSON.stringify(response.data, null, 2));
    }

    if (response.ok) {
        const normalizedData = normalizeMessages(response.data);
        if (normalizedData) {
            return NextResponse.json({ ...response, data: normalizedData }, { status: 200 });
        }
        lastResponse.hint = `WAHA response from ${path} was successful but the data format was not recognized or was empty.`;
    }
  }
  
  if (lastResponse) {
    if (!lastResponse.ok) {
        lastResponse.hint = `All API paths for messages failed. Last attempt on ${lastResponse.targetUrl} failed with status ${lastResponse.status}.`;
    }
    return NextResponse.json(lastResponse, { status: lastResponse.status === 500 ? 500 : 200 });
  }

  return NextResponse.json({ ok: false, hint: 'Could not attempt any WAHA API paths for messages.' }, { status: 500 });
}
