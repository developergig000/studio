
import { wahaRequest } from '@/lib/wahaClient';
import { NextResponse } from 'next/server';

type ContactMeta = {
  displayName: string;
  number: string | null;
  profilePictureURL: string | null;
  resolvedContactId: string;
};

// --- Helper Functions ---

/**
 * Normalizes various API responses to ensure the data object is at the top level.
 */
const normalizeResponseData = (data: any): any => {
  if (!data) return null;
  if (data.data && typeof data.data === 'object') return data.data;
  if (data.response && typeof data.response === 'object') return data.response;
  return data;
};

/**
 * Extracts a clean phone number from a contact ID string (e.g., '628123@c.us').
 */
const extractNumberFromId = (id: string): string | null => {
  if (id && id.includes('@c.us')) {
    return id.split('@')[0];
  }
  return null;
};

/**
 * Extracts a clean, digits-only phone number from a SenderAlt string.
 * e.g., "6289680597803:83@s.whatsapp.net" -> "6289680597803"
 */
const extractDigitsFromSenderAlt = (senderAlt: string | null | undefined): string | null => {
  if (!senderAlt) return null;
  const numberPart = senderAlt.split('@')[0]?.split(':')[0];
  if (!numberPart) return null;
  const digits = numberPart.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

/**
 * Fetches the last raw message from a chat to extract richer metadata.
 * Tries multiple common API paths used by different WAHA forks.
 */
async function fetchLastRawMessage(sessionName: string, chatId: string): Promise<any | null> {
  const possiblePaths = [
    `/api/sessions/${sessionName}/chats/${chatId}/messages?limit=1`,
    `/api/${sessionName}/messages?chatId=${chatId}&limit=1`,
    `/api/messages?chatId=${chatId}&session=${sessionName}&limit=1`,
    `/api/sessions/${sessionName}/messages?chatId=${chatId}&limit=1`,
  ];

  for (const path of possiblePaths) {
    const response = await wahaRequest({ path });
    if (response.ok) {
      const responseData = response.data;
      let rawMessages: any[] = [];
      if (Array.isArray(responseData)) {
        rawMessages = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        rawMessages = responseData.data;
      } else if (responseData && Array.isArray(responseData.messages)) {
        rawMessages = responseData.messages;
      } else if (responseData && Array.isArray(responseData.result)) {
        rawMessages = responseData.result;
      } else if (responseData && Array.isArray(responseData.response)) {
        rawMessages = responseData.response;
      }

      if (rawMessages.length > 0) {
        return rawMessages[0]; // Return the first raw message object
      }
    }
  }
  return null;
}

/**
 * Fetches contact info by trying multiple API paths.
 */
async function fetchContactInfo(sessionName: string, contactId: string): Promise<any | null> {
    const encodedId = encodeURIComponent(contactId);
    const possiblePaths = [
        `/api/sessions/${sessionName}/contacts/${encodedId}`,
        `/api/${sessionName}/contacts/${encodedId}`,
        `/api/contacts/${sessionName}/${encodedId}`,
        `/api/contacts/${encodedId}?session=${sessionName}`
    ];
    for (const path of possiblePaths) {
        const response = await wahaRequest({ path });
        if (response.ok && response.data) {
            return normalizeResponseData(response.data);
        }
    }
    return null;
}


/**
 * Fetches a profile picture, supporting both JSON (URL) and binary (image data) responses.
 * Tries multiple API paths for a given contact ID.
 */
async function fetchProfilePictureUrl(sessionName: string, contactId: string): Promise<string | null> {
    const baseURL = process.env.WAHA_INTERNAL_URL;
    const apiKey = process.env.WAHA_API_KEY;

    if (!baseURL || !apiKey || !contactId) return null;

    const encodedId = encodeURIComponent(contactId);
    const pathTemplates = [
        `/api/sessions/${sessionName}/contacts/${encodedId}/picture`,
        `/api/${sessionName}/contacts/${encodedId}/picture`,
        `/api/contacts/${sessionName}/${encodedId}/picture`,
        `/api/contacts/${encodedId}/picture?session=${sessionName}`,
        `/api/sessions/${sessionName}/contacts/${encodedId}/profile-picture`,
        `/api/${sessionName}/contacts/${encodedId}/profile-picture`,
    ];

    for (const path of pathTemplates) {
        const targetUrl = `${baseURL.replace(/\/$/, '')}${path}`;
        try {
            const response = await fetch(targetUrl, {
                headers: { 'X-Api-Key': apiKey.trim() }
            });

            if (!response.ok) continue;

            const contentType = response.headers.get('content-type');

            if (contentType?.includes('application/json')) {
                const json = await response.json();
                const url = json.url || json.picUrl || json.profilePicUrl || json.pictureUrl;
                if (url) return url;
            } else if (contentType?.includes('image') || contentType?.includes('application/octet-stream')) {
                const buffer = await response.arrayBuffer();
                const base64String = Buffer.from(buffer).toString('base64');
                return `data:${contentType};base64,${base64String}`;
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Profile picture fetch failed for path ${path}:`, error);
            }
        }
    }

    return null;
}

// --- Main API Route Handler ---
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
      displayName: searchParams.get('chatName') || contactId.split('@')[0],
      number: null,
      profilePictureURL: null,
      resolvedContactId: contactId,
    };
    return NextResponse.json({ ok: true, data: groupMeta });
  }

  // --- 2. Logic for Personal Chats (@c.us, @lid) ---
  try {
    let resolvedContactId = contactId;
    const isLidContact = contactId.includes('@lid');
    const displayNameFallback = isLidContact ? "LID Contact" : (extractNumberFromId(contactId) || contactId);
    
    // --- 3. Fetch Initial Contact Info ---
    const contactData = await fetchContactInfo(sessionName, resolvedContactId);
    
    // --- 4. Determine Initial Display Name & Number ---
    let displayName = contactData?.name || 
                      contactData?.pushname || 
                      contactData?.shortName || 
                      displayNameFallback;
    let contactNumber = contactData?.number || extractNumberFromId(resolvedContactId);
    let senderAlt: string | null = null;
    
    // --- 4a. Enrich with Last Message for LIDs or missing data ---
    if (isLidContact && (displayName === displayNameFallback || !contactNumber)) {
        const lastMessage = await fetchLastRawMessage(sessionName, contactId);
        if (lastMessage) {
            const infoObject = lastMessage._data?.Info || lastMessage._data?.info;
            const pushName = infoObject?.PushName || infoObject?.pushname || lastMessage.pushName || lastMessage.pushname;
            
            if (pushName && typeof pushName === 'string' && pushName.trim() !== '') {
                displayName = pushName;
            }

            senderAlt = infoObject?.SenderAlt || null;
            if (senderAlt && !contactNumber) {
                const numberFromAlt = extractDigitsFromSenderAlt(senderAlt);
                if (numberFromAlt) {
                    contactNumber = numberFromAlt;
                }
            }
        }
    }
    
    // --- 5. Fetch Profile Picture URL (Multi-Step Logic) ---
    let profilePictureURL: string | null = contactData?.picUrl || contactData?.avatarUrl || contactData?.profile?.picUrl || null;

    if (!profilePictureURL) {
      // Build a list of candidate IDs to try for fetching the picture.
      const pictureLookupCandidates = [
        resolvedContactId,
        senderAlt, // This will be null for non-LIDs or if not found
        contactNumber ? `${contactNumber}@s.whatsapp.net` : null,
        contactNumber ? `${contactNumber}@c.us` : null,
      ].filter(Boolean) as string[]; // Remove null/undefined candidates
      
      const uniqueCandidates = [...new Set(pictureLookupCandidates)];

      for (const candidateId of uniqueCandidates) {
          const picUrl = await fetchProfilePictureUrl(sessionName, candidateId);
          if (picUrl) {
              profilePictureURL = picUrl;
              break; // Stop on first success
          }
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
