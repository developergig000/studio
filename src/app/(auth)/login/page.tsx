'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
// Firebase imports for seeding
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await signIn(values.email, values.password);
      const idTokenResult = await userCredential.user.getIdTokenResult();
      const userRole = (idTokenResult.claims.role as string) || 'SALES';

      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });

      if (userRole === 'HEAD_SALES') {
        router.push('/dashboard/head');
      } else {
        router.push('/dashboard/sales');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unknown error occurred. Please try again.',
      });
      setIsSubmitting(false);
    }
  }

  React.useEffect(() => {
    if (!loading && user && !isSeeding) {
      router.replace('/');
    }
  }, [user, loading, router, isSeeding]);

  const handleSeed = async () => {
    setIsSeeding(true);
    toast({ title: 'Seeding database...', description: 'Please wait.' });

    try {
      if (auth.currentUser) {
        await signOut(auth);
      }

      const seedUsers = [
        { email: 'head.sales@example.com', password: 'password123', name: 'Head Sales', role: 'HEAD_SALES' },
        { email: 'sales.user@example.com', password: 'password123', name: 'Sales User', role: 'SALES' },
      ];

      let usersCreated = 0;
      let usersSkipped = 0;

      for (const seedUser of seedUsers) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, seedUser.email, seedUser.password);
          const newUser = userCredential.user;
          await setDoc(doc(db, 'users', newUser.uid), {
            id: newUser.uid,
            name: seedUser.name,
            email: seedUser.email,
            role: seedUser.role,
            createdAt: serverTimestamp(),
          });
          usersCreated++;
          await signOut(auth); // Sign out to create the next user
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            console.log(`User ${seedUser.email} already exists.`);
            usersSkipped++;
          } else {
            throw error;
          }
        }
      }

      toast({
        title: 'Seeding Complete',
        description: `${usersCreated} users created. ${usersSkipped} users skipped. You can now log in with the test accounts.`,
      });

    } catch (error: any) {
      console.error('Seeding error:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSeeding(false);
      // Ensure we are signed out at the end of the process
      if (auth.currentUser) {
        await signOut(auth);
      }
    }
  };


  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Logo className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="font-headline text-2xl">Welcome to SalesForceLite</CardTitle>
        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="head.sales@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting || isSeeding}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Sign In
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleSeed}
          disabled={isSubmitting || isSeeding}
        >
          {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Seed Database with Test Users
        </Button>
      </CardContent>
    </Card>
  );
}
