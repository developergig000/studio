'use client';

import * as React from 'react';
import { getSalesUsers } from '@/actions/users';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Mail, User as UserIcon, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

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
          <span>Joined: {user.createdAt ? format(new Date(user.createdAt.toString()), 'PPP') : 'N/A'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SalesTeamTable({ users, isLoading }: { users: User[], isLoading: boolean }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Users />Sales Team</CardTitle>
                <CardDescription>List of all sales representatives.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Joined Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <TableRow key={user.uid}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        {user.name}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.createdAt ? format(new Date(user.createdAt.toString()), 'PPP') : 'N/A'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">No sales users found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function HeadDashboardPage() {
  const { user } = useAuth();
  const [salesUsers, setSalesUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      const users = await getSalesUsers();
      setSalesUsers(users);
      setIsLoading(false);
    }
    if (user?.role === 'HEAD_SALES') {
      fetchUsers();
    }
  }, [user]);

  return (
    <div className="container mx-auto py-8">
      <UserProfileCard user={user} />
      <SalesTeamTable users={salesUsers} isLoading={isLoading} />
    </div>
  );
}
