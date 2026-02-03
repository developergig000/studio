'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { collection, doc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth, db } from '@/lib/firebase/client';
import type { User, UserGroup, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const addFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  role: z.enum(['SALES', 'HEAD_SALES']),
  group: z.enum(['Yogyakarta', 'Pekanbaru']),
});

const editFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  role: z.enum(['SALES', 'HEAD_SALES']),
  group: z.enum(['Yogyakarta', 'Pekanbaru']),
  wahaSessionName: z.string().optional(),
  wahaPhoneNumber: z.string().optional(),
});

export default function UserManagementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const addForm = useForm<z.infer<typeof addFormSchema>>({
    resolver: zodResolver(addFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'SALES',
      group: 'Yogyakarta',
    },
  });
  
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

  async function onAddSubmit(values: z.infer<typeof addFormSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        id: newUser.uid,
        name: values.name,
        email: values.email,
        role: values.role as UserRole,
        group: values.group as UserGroup,
        createdAt: serverTimestamp(),
      });

      await signOut(auth);
      
      toast({
        title: 'User Created Successfully',
        description: 'You have been signed out. Please log in again to continue.',
      });

      router.push('/login');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to create user',
        description: error.code === 'auth/email-already-in-use' 
          ? 'This email address is already in use by another account.'
          : error.message || 'An unknown error occurred.',
      });
      setIsSubmitting(false);
    }
  }

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      name: user.name || '',
      role: user.role || 'SALES',
      group: user.group || 'Yogyakarta',
      wahaSessionName: user.wahaSessionName || '',
      wahaPhoneNumber: user.wahaPhoneNumber || '',
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!selectedUser) return;
    setIsEditSubmitting(true);
    try {
        const userRef = doc(db, 'users', selectedUser.uid);
        await updateDoc(userRef, {
            name: values.name,
            role: values.role,
            group: values.group,
            wahaSessionName: values.wahaSessionName || '',
            wahaPhoneNumber: values.wahaPhoneNumber || null,
        });
        toast({ title: 'User Updated Successfully' });
        setIsEditDialogOpen(false);
        fetchUsers(); // Refresh user list
    } catch (error: any) {
        console.error("Update failed: ", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsEditSubmitting(false);
    }
  }


  return (
    <>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
              <CardDescription>Create a new user account and assign a role and group.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min. 8 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SALES">SALES</SelectItem>
                            <SelectItem value="HEAD_SALES">HEAD_SALES</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="group"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yogyakarta">Yogyakarta</SelectItem>
                            <SelectItem value="Pekanbaru">Pekanbaru</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create User
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Existing Users</CardTitle>
              <CardDescription>A list of all users in the system.</CardDescription>
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
                    <TableHead>Actions</TableHead>
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
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : users.length > 0 ? (
                    users.map((user) => (
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
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Update the user's details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALES">SALES</SelectItem>
                        <SelectItem value="HEAD_SALES">HEAD_SALES</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Yogyakarta">Yogyakarta</SelectItem>
                        <SelectItem value="Pekanbaru">Pekanbaru</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="wahaSessionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WAHA Session Name</FormLabel>
                    <FormControl>
                      <Input placeholder="session-name-from-waha" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Link an existing WAHA session to avoid re-scanning QR.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="wahaPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WAHA Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 628123456789" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Optional. Will be auto-updated by the system when the session connects.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isEditSubmitting}>
                  {isEditSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
