import type { Timestamp } from 'firebase/firestore';

export type UserRole = "HEAD_SALES" | "SALES";

export type User = {
  uid: string;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  createdAt: Timestamp | string | null;
};
