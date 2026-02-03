'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Pencil, Check, X, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { collection, doc, getDocs, Timestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const editFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  role: z.enum(['SALES', 'HEAD_SALES']),
  group: z.enum(['Yogyakarta', 'Pekanbaru']),
  wahaSessionName: z.string().optional(),
  wahaPhoneNumber: z.string().optional(),
});

export default function UserManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  });

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map((doc): User => {
        const data = doc.data();
        return {
          uid: doc.id,
          id: doc.id,
          name: data.name,
          email: data.email,
          role: data.role,
          group: data.group,
          createdAt: data.createdAt,
          wahaSessionName: data.wahaSessionName,
          wahaPhoneNumber: data.wahaPhoneNumber,
        };
      });
      setUsers(usersData);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to fetch users',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user: User) => {
    setEditingUserId(user.uid);
    editForm.reset({
      name: user.name || '',
      role: user.role || 'SALES',
      group: user.group || 'Yogyakarta',
      wahaSessionName: user.wahaSessionName || '',
      wahaPhoneNumber: user.wahaPhoneNumber || '',
    });
  };

  const handleCancelClick = () => {
    setEditingUserId(null);
  };

  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!editingUserId) return;
    setIsEditSubmitting(true);
    try {
        const userRef = doc(db, 'users', editingUserId);
        await updateDoc(userRef, {
            name: values.name,
            role: values.role,
            group: values.group,
            wahaSessionName: values.wahaSessionName || '',
            wahaPhoneNumber: values.wahaPhoneNumber || null,
        });
        toast({ title: 'User Updated Successfully' });
        setEditingUserId(null);
        fetchUsers();
    } catch (error: any) {
        console.error("Update failed: ", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsEditSubmitting(false);
    }
  }


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Existing Users</CardTitle>
            <CardDescription>A list of all users in the system. Click the pencil to edit a row.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/head/user-management/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New User
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>WAHA Session</TableHead>
                <TableHead>WAHA Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user) => {
                  const isEditing = editingUserId === user.uid;
                  return isEditing ? (
                    <Form {...editForm} key={user.uid}>
                      <TableRow className="bg-muted/50">
                        <TableCell>
                          <FormField control={editForm.control} name="name" render={({ field }) => (
                            <Input {...field} className="h-8 text-xs" />
                          )} />
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <FormField control={editForm.control} name="role" render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SALES">SALES</SelectItem>
                                <SelectItem value="HEAD_SALES">HEAD_SALES</SelectItem>
                              </SelectContent>
                            </Select>
                          )} />
                        </TableCell>
                        <TableCell>
                           <FormField control={editForm.control} name="group" render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Yogyakarta">Yogyakarta</SelectItem>
                                <SelectItem value="Pekanbaru">Pekanbaru</SelectItem>
                              </SelectContent>
                            </Select>
                          )} />
                        </TableCell>
                        <TableCell>
                           <FormField control={editForm.control} name="wahaSessionName" render={({ field }) => (
                              <Input {...field} value={field.value ?? ''} className="h-8 text-xs" />
                            )} />
                        </TableCell>
                        <TableCell>
                           <FormField control={editForm.control} name="wahaPhoneNumber" render={({ field }) => (
                              <Input {...field} value={field.value ?? ''} className="h-8 text-xs" />
                            )} />
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? format((user.createdAt as Timestamp).toDate(), 'PP') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={editForm.handleSubmit(onEditSubmit)} disabled={isEditSubmitting}>
                                  {isEditSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={handleCancelClick} disabled={isEditSubmitting}>
                                  <X className="h-4 w-4 text-red-600" />
                              </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </Form>
                  ) : (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'HEAD_SALES' ? 'default' : 'outline'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.group ? <Badge variant="secondary">{user.group}</Badge> : 'N/A'}
                      </TableCell>
                      <TableCell>{user.wahaSessionName || 'N/A'}</TableCell>
                      <TableCell>{user.wahaPhoneNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {user.createdAt ? format((user.createdAt as Timestamp).toDate(), 'PP') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
