'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Loader2, LogOut, User, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import Link from 'next/link';

function getInitials(name?: string | null) {
  return name
    ?.split(' ')
    .map(n => n[0])
    .join('');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
  React.useEffect(() => {
    if (user && user.role) {
      if (pathname.startsWith('/dashboard/head') && user.role !== 'HEAD_SALES') {
        router.replace('/'); 
      }
      if (pathname.startsWith('/dashboard/sales') && user.role !== 'SALES') {
        router.replace('/');
      }
    }
  }, [user, pathname, router]);


  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard/head')) return 'My Dashboard';
    if (pathname.startsWith('/dashboard/sales')) return 'My Profile';
    if (pathname.startsWith('/dashboard/profile')) return 'Edit Profile';
    return user.role === 'HEAD_SALES' ? 'My Dashboard' : 'My Profile';
  };
  
  const pageTitle = getPageTitle();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-lg font-headline font-semibold">SalesForceLite</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {user.role === 'HEAD_SALES' && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/head')}>
                            <Link href="/dashboard/head"><LayoutDashboard />My Dashboard</Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {user.role === 'SALES' && (
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/sales')}>
                            <Link href="/dashboard/sales"><User />My Profile</Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/profile')}>
                        <Link href="/dashboard/profile"><Settings />Edit Profile</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
            <div className="flex items-center gap-3 p-2">
                <Avatar>
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} className="ml-auto">
                    <LogOut className="h-5 w-5"/>
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
