'use client';

import * as React from 'react';
import { seedInitialUsers } from '@/actions/seed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = React.useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    const result = await seedInitialUsers();
    if (result.success) {
      toast({
        title: 'Seeding Successful',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: result.message,
      });
    }
    setIsSeeding(false);
  };

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Seed Initial Users</CardTitle>
        <CardDescription>
          This is a development tool. Click the button to populate the database with initial user accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          This will only run if the `users` collection in Firestore is empty.
        </p>
        <Button onClick={handleSeed} disabled={isSeeding} className="w-full max-w-xs">
          {isSeeding ? <Loader2 className="animate-spin" /> : <DatabaseZap />}
          Run Seed
        </Button>
        <Button variant="link" asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
