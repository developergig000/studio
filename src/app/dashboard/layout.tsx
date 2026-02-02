'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Loader2, LogOut, User, Settings, Users, MessageSquare } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    if (pathname === '/dashboard/head') return 'My Dashboard';
    if (pathname === '/dashboard/head/user-management') return 'User Management';
    if (pathname.startsWith('/dashboard/sales')) return 'My Profile';
    if (pathname.startsWith('/dashboard/profile')) return 'Edit Profile';
    if (pathname.startsWith('/dashboard/chat')) return 'Obrolan';
    return user.role === 'HEAD_SALES' ? 'My Dashboard' : 'My Profile';
  };
  
  const pageTitle = getPageTitle();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-lg font-headline font-semibold">GreenlabCRM</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {user.role === 'HEAD_SALES' && (
                    <>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname === '/dashboard/head'}>
                                <Link href="/dashboard/head"><LayoutDashboard />My Dashboard</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname === '/dashboard/head/user-management'}>
                                <Link href="/dashboard/head/user-management"><Users />User Management</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/chat')}>
                                <Link href="/dashboard/chat"><MessageSquare />Obrolan</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </>
                )}
                {user.role === 'SALES' && (
                     <>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/sales')}>
                                <Link href="/dashboard/sales"><User />My Profile</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/chat')}>
                                <Link href="/dashboard/chat"><MessageSquare />Obrolan</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                     </>
                )}
            </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <SidebarTrigger />
          <h1 className="flex-1 text-xl font-semibold">{pageTitle}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
