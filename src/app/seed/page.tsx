'use client';

import * as React from 'react';
import { collection, getDocs, setDoc, doc, serverTimestamp, query, limit } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

import { db, auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';

const usersToSeed = [
  { name: 'Nadya Galuh Prabandini', role: 'HEAD_SALES' as UserRole, email: 'nadya@msbd.co.id', password: '12345678' },
  { name: 'Khairunnisa Shultoni Marien', role: 'SALES' as UserRole, email: 'khairunnisa@msbd.co.id', password: '12345678' },
  { name: 'Sika Harum Al Humairo', role: 'SALES' as UserRole, email: 'sika@msbd.co.id', password: '12345678' },
  { name: 'Rika Saputri Anggraini', role: 'SALES' as UserRole, email: 'rika@msbd.co.id', password: '12345678' },
  { name: 'Dimas Ananda Nugroho', role: 'SALES' as UserRole, email: 'dimas@msbd.co.id', password: '12345678' },
];

export default function SeedPage() {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [status, setStatus] = React.useState('Ready to seed database with initial users.');

  const handleSeed = async () => {
    setIsSeeding(true);
    setStatus('Checking if database is already seeded...');
    toast({ title: 'Starting Seeding Process...', description: 'Please wait.' });

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const message = 'Database already contains users. Seeding aborted.';
        setStatus(message);
        toast({
          variant: 'destructive',
          title: 'Seeding Not Required',
          description: message,
        });
        setIsSeeding(false);
        return;
      }
      
      setStatus(`Seeding ${usersToSeed.length} users...`);
      for (const userData of usersToSeed) {
        setStatus(`Creating user: ${userData.email}`);
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const { user } = userCredential;
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          createdAt: serverTimestamp(),
        });
        setStatus(`Successfully created ${userData.email}`);
      }

      // Sign out the last created user to ensure a clean state
      await signOut(auth);

      const successMessage = `Successfully seeded ${usersToSeed.length} users. You can now log in.`;
      setStatus(successMessage);
      toast({
        title: 'Seeding Successful',
        description: successMessage,
      });

    } catch (error: any) {
      console.error('Seeding error:', error);
      const errorMessage = error.message || 'An unknown error occurred.';
      setStatus(`Seeding failed: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: errorMessage,
      });
      // Attempt to sign out in case of partial failure
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Failed to sign out after seeding error:", signOutError);
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Database Seeding (Client-Side)</CardTitle>
          <CardDescription>
            Click the button to populate the Firestore database with initial user accounts for development. This will only run if the 'users' collection is empty.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-semibold">Current Status:</p>
            <p>{status}</p>
          </div>
          <Button
            className="w-full"
            onClick={handleSeed}
            disabled={isSeeding}
          >
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Seed Initial Users
          </Button>
           <div className="mt-4 text-center text-sm">
              <Link href="/login" className="underline">
                Back to Login
              </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
