'use server';

import admin from '@/lib/firebase/admin';
import type { UserRole } from '@/lib/types';

const initialUsers = [
  { name: 'Nadya Galuh Prabandini', role: 'HEAD_SALES' as UserRole, email: 'nadya@msbd.co.id', password: 'password123' },
  { name: 'Khairunnisa Shultoni Marien', role: 'SALES' as UserRole, email: 'khairunnisa@msbd.co.id', password: 'password123' },
  { name: 'Sika Harum Al Humairo', role: 'SALES' as UserRole, email: 'sika@msbd.co.id', password: 'password123' },
  { name: 'Rika Saputri Anggraini', role: 'SALES' as UserRole, email: 'rika@msbd.co.id', password: 'password123' },
  { name: 'Dimas Ananda Nugroho', role: 'SALES' as UserRole, email: 'dimas@msbd.co.id', password: 'password123' },
];

export async function seedInitialUsers(): Promise<{ success: boolean; message: string }> {
  try {
    const usersCollection = admin.firestore().collection('users');
    const snapshot = await usersCollection.limit(1).get();

    if (!snapshot.empty) {
      return { success: false, message: 'Users collection is not empty. Seeding aborted.' };
    }

    const createdUsers = [];
    for (const userData of initialUsers) {
      const { email, password, role, name } = userData;

      try {
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });

        await admin.auth().setCustomUserClaims(userRecord.uid, { role });

        await usersCollection.doc(userRecord.uid).set({
          name,
          email,
          role,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        createdUsers.push({ email: userRecord.email });
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`User ${email} already exists. Skipping.`);
          // If user exists in auth, ensure firestore and claims are set
          const userRecord = await admin.auth().getUserByEmail(email);
          await admin.auth().setCustomUserClaims(userRecord.uid, { role });
          const userDoc = await usersCollection.doc(userRecord.uid).get();
          if (!userDoc.exists) {
            await usersCollection.doc(userRecord.uid).set({
              name,
              email,
              role,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } else {
          throw error;
        }
      }
    }

    return { success: true, message: `Successfully seeded ${initialUsers.length} users.` };
  } catch (error: any) {
    console.error('Error seeding users:', error);
    return { success: false, message: error.message || 'An unknown error occurred.' };
  }
}
