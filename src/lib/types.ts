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

export type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
};

export type Chat = {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
};
