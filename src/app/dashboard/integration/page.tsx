'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Server, CheckCircle, XCircle, UserCheck, Plug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function IntegrationPage() {
  const { user } = useAuth();
  const [firestoreStatus, setFirestoreStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handlePingFirestore = async () => {
    setFirestoreStatus('loading');
    setErrorMessage(null);
    try {
      // This query is allowed by security rules for any authenticated user
      // to check for the existence of users (for seeding). We can leverage it here.
      const usersQuery = query(collection(db, 'users'), limit(1));
      await getDocs(usersQuery);
      setFirestoreStatus('success');
    } catch (error: any) {
      setFirestoreStatus('error');
      setErrorMessage(error.message || 'An unknown error occurred.');
      console.error("Firestore Ping Error:", error);
    }
  };

  const renderStatus = () => {
    switch (firestoreStatus) {
      case 'loading':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Pinging Firestore...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Connection to Firestore successful.</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col gap-2 text-destructive">
            <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span>Connection to Firestore failed.</span>
            </div>
            <p className="text-xs bg-destructive/10 p-2 rounded-md">{errorMessage}</p>
          </div>
        );
      case 'idle':
      default:
        return <p className="text-sm text-muted-foreground">Click the button to test the connection to the database.</p>;
    }
  };


  return (
    <div className="flex flex-col gap-6">
       <div className="space-y-1">
         <h1 className="font-headline text-2xl font-semibold tracking-tight">System Integration Status</h1>
         <p className="text-muted-foreground">Check the connection status to external services.</p>
       </div>
        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <UserCheck className="h-6 w-6" />
                    <CardTitle>Authentication Service</CardTitle>
                </div>
                <CardDescription>
                    Checks if you are correctly authenticated with the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {user ? (
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Authenticated</Badge>
                        <span className="text-sm text-muted-foreground">Logged in as {user.email}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="destructive">Not Authenticated</Badge>
                        <span className="text-sm text-muted-foreground">No user is currently logged in.</span>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <Server className="h-6 w-6" />
                    <CardTitle>Firestore Database</CardTitle>
                </div>
                <CardDescription>
                   Performs a real-time data read test to ensure the database is reachable and security rules are working.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handlePingFirestore} disabled={firestoreStatus === 'loading'}>
                    {firestoreStatus === 'loading' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Plug className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                </Button>
                <div className="rounded-lg border p-4 min-h-[60px] flex items-center">
                    {renderStatus()}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
