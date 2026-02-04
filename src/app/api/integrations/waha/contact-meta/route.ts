
import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

type ContactMeta = {
  displayName: string;
  number: string | null;
  profilePictureURL: string | null;
  resolvedContactId: string;
};

// Helper function to normalize various API responses.
const normalizeResponseData = (data: any): any => {
  if (!data) return null;
  // If the actual data is nested under a 'data' or 'response' key
  if (data.data && typeof data.data === 'object') return data.data;
  if (data.response && typeof data.response === 'object') return data.response;
  return data;
};

// Helper to extract number from ID, returns null if not a @c.us ID
const extractNumberFromId = (id: string): string | null => {
    if (id && id.includes('@c.us')) {
        return id.split('@')[0];
    }
    return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionName = searchParams.get('sessionName');
  const contactId = searchParams.get('contactId');

  if (!sessionName || !contactId) {
    return NextResponse.json(
      { ok: false, hint: 'sessionName and contactId are required.' },
      { status: 400 }
    );
  }

  // --- 1. Handle Group Chats Early ---
  if (contactId.endsWith('@g.us')) {
    const groupMeta: ContactMeta = {
      displayName: searchParams.get('chatName') || contactId.split('@')[0], // Use provided chat name or fallback
      number: null,
      profilePictureURL: null,
      resolvedContactId: contactId,
    };
    return NextResponse.json({ ok: true, data: groupMeta });
  }

  // --- 2. Logic for Personal Chats (@c.us, @lid) ---
  let resolvedContactId = contactId;
  let displayNameFallback = extractNumberFromId(contactId) || contactId; // Fallback is phone number or original ID
  
  // Placeholder for LID resolution if your WAHA fork supports it.
  // Most don't have a standard endpoint, so we proceed with the LID.
  if (contactId.includes('@lid')) {
     displayNameFallback = "LID Contact"; // A more specific fallback for LIDs
  }

  try {
    // --- 3. Fetch Contact Information ---
    // This single endpoint often contains name, pushname, and number.
    const contactInfoResponse = await wahaRequest({
      path: `/api/${sessionName}/contacts/${resolvedContactId}`,
    });

    const contactData = normalizeResponseData(contactInfoResponse.data);

    // --- 4. Determine Best Display Name and Number ---
    const displayName = contactData?.name || contactData?.pushname || contactData?.shortName || displayNameFallback;
    const contactNumber = contactData?.number || extractNumberFromId(resolvedContactId);
    
    // --- 5. Fetch Profile Picture URL (Smarter Logic) ---
    // First, try to get it from the main contact data, as it's more efficient.
    let profilePictureURL: string | null = contactData?.picUrl || contactData?.avatarUrl || contactData?.profile?.picUrl || null;

    // If we didn't find the URL in the main contact data, THEN try the dedicated /picture endpoint.
    if (!profilePictureURL) {
      const profilePicResponse = await wahaRequest({
        path: `/api/${sessionName}/contacts/${resolvedContactId}/picture`,
      });
      const picData = normalizeResponseData(profilePicResponse.data);
      
      if (profilePicResponse.ok && picData?.url) {
        profilePictureURL = picData.url;
      }
    }

    // --- 6. Assemble Final Metadata ---
    const finalMeta: ContactMeta = {
      displayName,
      number: contactNumber,
      profilePictureURL,
      resolvedContactId,
    };

    return NextResponse.json({ ok: true, data: finalMeta });

  } catch (error: any) {
    return NextResponse.json(
      { ok: false, hint: 'An internal server error occurred while fetching contact meta.', error: error.message },
      { status: 500 }
    );
  }
}
