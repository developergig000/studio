
import { wahaRequest, type WahaApiResponse } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';
import type { WahaChat } from '@/lib/types';

/**
 * Normalizes the response from various WAHA forks into a standard WahaChat array.
 * It flexibly checks different possible structures in the response data.
 * @param responseData - The raw data from the WAHA API response.
 * @returns A normalized array of WahaChat objects, or null if no valid chat array is found.
 */
function normalizeChats(responseData: any): WahaChat[] | null {
    let rawChats: any[] = [];

    if (Array.isArray(responseData)) {
        rawChats = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
        rawChats = responseData.data;
    } else if (responseData && Array.isArray(responseData.chats)) {
        rawChats = responseData.chats;
    } else if (responseData && Array.isArray(responseData.result)) {
        rawChats = responseData.result;
    } else if (responseData && Array.isArray(responseData.response)) { // Added for more flexibility
        rawChats = responseData.response;
    }

    if (rawChats.length > 0) {
        // Map to our standard WahaChat format, providing fallbacks for missing fields
        return rawChats.map(chat => {
            // Expanded name-finding logic
            let name = chat.name ||
                       chat.pushname || // Common property
                       chat.formattedName || // Another common one
                       chat.contact?.name ||
                       chat.contact?.pushname ||
                       (typeof chat.id === 'object' ? chat.id.user : chat.id) || // Use user part of ID object, or ID string
                       'Unknown';

            // Clean up name if it's a raw ID (like 12345@c.us or 12345@lid)
            if (typeof name === 'string' && name.includes('@')) {
                name = name.split('@')[0];
            }

            return {
                id: chat.id?._serialized || chat.id || '', // Handle object or string ID for the ID field
                name: name, // Use the cleaned-up name
                profilePicUrl: chat.profilePicUrl || chat.picUrl || chat.avatar || chat.contact?.profilePicUrl || chat.contact?.avatar || null,
                isGroup: chat.isGroup || false,
                timestamp: chat.timestamp || 0,
                lastMessage: chat.lastMessage ? {
                    body: chat.lastMessage.body || '',
                    timestamp: chat.lastMessage.timestamp || 0,
                } : null,
            }
        });
    }

    return null;
}


/**
 * Endpoint to fetch the list of chats for a specific WAHA session.
 * It resiliently tries multiple common API paths and normalizes different response structures
 * to support various WAHA forks.
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

  // Define a list of possible endpoint paths to try, in order of priority.
  const possiblePaths = [
    `/api/sessions/${sessionName}/chats`,
    `/api/chats/${sessionName}`,
    `/api/${sessionName}/chats`
  ];

  let lastResponse: WahaApiResponse | null = null;

  for (const path of possiblePaths) {
    const response = await wahaRequest({
      path: path,
      hint: `Attempt failed for path: ${path}.`,
    });
    lastResponse = response;

    // In dev mode, log the raw response for debugging purposes
    if (process.env.NODE_ENV === 'development') {
      console.log(`RAW WAHA RESPONSE (Chats, Path: ${path}):`, JSON.stringify(response.data, null, 2));
    }
    
    if (response.ok) {
      const normalizedData = normalizeChats(response.data);
      
      if (normalizedData) {
        // Success: We found and normalized the chat data.
        return NextResponse.json({ ...response, data: normalizedData }, { status: 200 });
      }
      // If response is ok but data is not parseable, we continue to the next path.
      // We update the hint to be more specific for the final error message if needed.
      lastResponse.hint = `WAHA response from ${path} was successful but the data format was not recognized or was empty.`;
    }
    // If not response.ok (e.g., 404), the loop continues to the next path.
  }

  // If the loop completes, all attempts failed.
  // Return the last response, which contains the final error information.
  if (lastResponse) {
    // Add a more helpful final message if all paths failed.
    if (!lastResponse.ok) {
        lastResponse.hint = `All API paths failed. Last attempt on ${lastResponse.targetUrl} failed with status ${lastResponse.status}. Please verify your WAHA service and endpoints.`;
    }
    return NextResponse.json(lastResponse, { status: lastResponse.status === 500 ? 500 : 200 });
  }

  // Fallback for an unexpected state where no requests were even made.
  return NextResponse.json({ ok: false, hint: 'Could not attempt any WAHA API paths.' }, { status: 500 });
}
