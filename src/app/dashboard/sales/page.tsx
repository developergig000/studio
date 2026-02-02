'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

export default function SalesDashboardPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('');

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-headline text-4xl">{user.name}</CardTitle>
              <CardDescription className="text-lg">Your Personal Dashboard</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Badge variant="outline" className="text-base">{user.role}</Badge>
            <p className="text-sm text-muted-foreground">Your assigned role in the system.</p>
          </div>
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Mail className="h-6 w-6 text-primary" />
            <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">Your registered email address.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
                <p className="font-medium">
                  {user.createdAt ? format((user.createdAt as Timestamp).toDate(), 'PPP') : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">The date you joined the platform.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
