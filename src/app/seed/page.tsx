'use client';

import * as React from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SeedPage() {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [status, setStatus] = React.useState('Ready to seed database.');

  const handleSeed = async () => {
    setIsSeeding(true);
    setStatus('Calling seed function... Please wait.');
    toast({ title: 'Seeding database...', description: 'This may take a moment.' });

    try {
      // Let Firebase automatically discover the initialized app instance.
      const functions = getFunctions();
      const seedInitialUsers = httpsCallable(functions, 'seedInitialUsers');
      const result = await seedInitialUsers();
      
      const data = result.data as { message: string };

      setStatus(`Seeding complete: ${data.message}`);
      toast({
        title: 'Seeding Successful',
        description: data.message,
      });

    } catch (error: any) {
      console.error('Seeding error:', error);
      
      // Provide more details for HttpsError from Cloud Functions
      if (error.code && error.details) {
        setStatus(`Seeding failed: ${error.message} (Code: ${error.code})`);
        toast({
          variant: 'destructive',
          title: `Seeding Failed: ${error.code}`,
          description: error.message,
        });
      } else {
        setStatus(`Seeding failed: ${error.message}`);
        toast({
          variant: 'destructive',
          title: 'Seeding Failed',
          description: error.message || 'An unknown error occurred.',
        });
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Database Seeding</CardTitle>
          <CardDescription>
            Use this tool to populate the Firestore database with initial user accounts for development purposes.
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
          <p className="text-center text-xs text-muted-foreground">
            This action calls the `seedInitialUsers` Cloud Function.
          </p>
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
