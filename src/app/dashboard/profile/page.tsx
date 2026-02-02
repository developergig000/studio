'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.password && data.password.length < 8) {
    return false;
  }
  return true;
}, {
  message: 'Password must be at least 8 characters.',
  path: ['password'],
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { user, updateProfileData } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      confirmPassword: '',
    },
  });
  
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [user, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsSubmitting(true);

    const dataToUpdate: { name?: string; email?: string; password?: string } = {};

    if (values.name !== user.name) {
      dataToUpdate.name = values.name;
    }
    if (values.email !== user.email) {
      dataToUpdate.email = values.email;
    }
    if (values.password) {
      dataToUpdate.password = values.password;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      toast({
        title: 'No Changes Detected',
        description: 'You have not made any changes to your profile.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateProfileData(dataToUpdate);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      form.reset({
        ...form.getValues(),
        password: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error(error);
      let description = 'An unknown error occurred. Please try again.';
      if (error.code === 'auth/requires-recent-login') {
          description = 'This operation is sensitive and requires recent authentication. Please log out and log back in to update your email or password.';
      } else {
          description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Edit Your Profile</CardTitle>
          <CardDescription>Update your personal information. Leave password fields blank to keep your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
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
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Leave blank to keep current" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
