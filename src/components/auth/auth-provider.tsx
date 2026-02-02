'use client';

import * as React from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type UserCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { User } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  updateProfileData: (data: { name?: string; email?: string; password?: string }) => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeIdToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh
        const sessionCookie = await firebaseUser.getIdToken();

        // Set cookie for server components
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionCookie }),
        });

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const firestoreUser = docSnap.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firestoreUser.name,
                role: firestoreUser.role || idTokenResult.claims.role,
                createdAt: firestoreUser.createdAt,
              });
            } else {
              // This case might happen during sign-up race conditions
              // For now, we assume doc exists for a logged-in user
              console.warn('User document not found in Firestore for UID:', firebaseUser.uid);
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName,
                role: idTokenResult.claims.role as any,
                createdAt: null,
              });
            }
            setLoading(false);
          },
          (error) => {
            const contextualError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', contextualError);
            setLoading(false);
            setUser(null);
          }
        );
      } else {
        // Clear cookie
        await fetch('/api/auth/session', { method: 'DELETE' });
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeIdToken();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const signIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfileData = async (data: { name?: string; email?: string; password?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No user is currently signed in.");
    }
  
    const promises = [];
  
    // Update name in Firestore
    if (data.name) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      promises.push(updateDoc(userDocRef, { name: data.name }));
    }
  
    // Update email in Firebase Auth
    if (data.email) {
      promises.push(updateEmail(currentUser, data.email));
    }
  
    // Update password in Firebase Auth
    if (data.password) {
      promises.push(updatePassword(currentUser, data.password));
    }
  
    await Promise.all(promises);
  };

  const value = { user, loading, signIn, signOut, updateProfileData };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
