
import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

type ContactMeta = {
  displayName: string | null;
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

// Helper to extract number from ID
const extractNumberFromId = (id: string): string | null => {
    if (id.includes('@c.us')) {
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

  // Handle group chats separately and exit early.
  if (contactId.endsWith('@g.us')) {
    const groupMeta: ContactMeta = {
      displayName: searchParams.get('chatName') || contactId.split('@')[0], // Use provided chat name or fallback
      number: null,
      profilePictureURL: null,
      resolvedContactId: contactId,
    };
    return NextResponse.json({ ok: true, data: groupMeta });
  }

  // --- Logic for personal chats (@c.us, @lid) ---
  let resolvedContactId = contactId;
  let fallbackName = extractNumberFromId(contactId);

  // Note: LID resolution is a placeholder for a potential future implementation.
  // Most WAHA forks do not have a standard LID resolution endpoint.
  // If your WAHA fork has one, you would add the request logic here.
  if (contactId.includes('@lid')) {
     // For now, we use the LID as the primary identifier and try to get info.
     // A more advanced implementation would resolve LID to a phone number first.
     fallbackName = 'Unknown LID Contact';
  }


  try {
    // 1. Fetch contact details (name, pushname, number)
    const contactInfoResponse = await wahaRequest({
      path: `/api/${sessionName}/contacts/${resolvedContactId}`,
    });

    const contactData = normalizeResponseData(contactInfoResponse.data);
    
    const displayName = contactData?.name || contactData?.pushname || fallbackName;
    const contactNumber = contactData?.number || extractNumberFromId(resolvedContactId);

    // 2. Fetch profile picture URL
    const profilePicResponse = await wahaRequest({
      path: `/api/${sessionName}/contacts/${resolvedContactId}/picture`,
    });
    const picData = normalizeResponseData(profilePicResponse.data);
    const profilePictureURL = (profilePicResponse.ok && picData?.url) ? picData.url : null;
    
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
