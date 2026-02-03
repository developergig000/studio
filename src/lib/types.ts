
import type { Timestamp } from 'firebase/firestore';

export type UserRole = "HEAD_SALES" | "SALES";
export type UserGroup = "Yogyakarta" | "Pekanbaru";
export type WahaSessionStatus = 'disconnected' | 'loading' | 'qrcode' | 'connected';

export type User = {
  uid: string;
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  group?: UserGroup | null;
  createdAt: Timestamp | null;
  wahaSessionName?: string;
  wahaPhoneNumber?: string;
  wahaStatus?: WahaSessionStatus;
  wahaQrCode?: string;
};

// For WAHA chats
export type WahaChat = {
  id: string; // e.g., '1234567890@c.us'
  name: string; // Contact name or group subject
  isGroup: boolean;
  timestamp: number;
  lastMessage: {
      body: string;
      timestamp: number;
  } | null;
};

// For WAHA messages
export type WahaMessage = {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
};
