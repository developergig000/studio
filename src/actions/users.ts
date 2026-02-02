'use server';

import admin from '@/lib/firebase/admin';
import type { User } from '@/lib/types';
import { cookies } from 'next/headers';

async function verifyIdToken() {
    const sessionCookie = cookies().get('__session')?.value || '';
    if (!sessionCookie) {
        throw new Error('Not authenticated');
    }
    return admin.auth().verifySessionCookie(sessionCookie, true);
}


export async function getSalesUsers(): Promise<User[]> {
  try {
    const decodedClaims = await verifyIdToken();
    if (decodedClaims.role !== 'HEAD_SALES') {
        throw new Error('Unauthorized: Only HEAD_SALES can view this data.');
    }

    const usersCollection = admin.firestore().collection('users');
    const snapshot = await usersCollection.where('role', '==', 'SALES').get();

    if (snapshot.empty) {
      return [];
    }

    const salesUsers: User[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      salesUsers.push({
        uid: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt.toDate().toISOString(), // Convert Timestamp to string
      } as User);
    });

    return salesUsers;
  } catch (error) {
    console.error('Error fetching sales users:', error);
    // In a real app, you'd want more robust error handling
    return [];
  }
}
