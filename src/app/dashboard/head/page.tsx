'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

function UserProfileCard({ user }: { user: User | null }) {
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('');

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="font-headline text-3xl">{user.name}</CardTitle>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" /> <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Joined: {user.createdAt ? format((user.createdAt as Timestamp).toDate(), 'PPP') : 'N/A'}</span>
        </div>
      </CardContent>
    </Card>
  );
}


export default function HeadDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <UserProfileCard user={user} />
    </div>
  );
}
