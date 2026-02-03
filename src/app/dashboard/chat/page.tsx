'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { User, WahaChat, WahaMessage } from '@/lib/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageCircle, ServerCrash, AlertTriangle, FileText, ImageIcon, Video, Headphones, Search } from 'lucide-react';
import type { WahaApiResponse } from '@/lib/wahaClient';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

// Helper function to get user initials
function getInitials(name?: string | null) {
  if (!name) return 'WA';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return parts[0][0] + parts[parts.length - 1][0];
  }
  return name.substring(0, 2);
}

// ChatList component (Left Panel)
function ChatList({
  salesUsers,
  onSelectSalesUser,
  selectedSalesUser,
  chats,
  onSelectChat,
  isLoading,
  error,
  loadingMessage,
}: {
  salesUsers: User[];
  onSelectSalesUser: (userId: string) => void;
  selectedSalesUser: User | null;
  chats: WahaChat[];
  onSelectChat: (chatId: string) => void;
  isLoading: boolean;
  error: string | null;
  loadingMessage: string | null;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-y-1">
        <div className="p-2 border-b">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground px-2">Pantau Pengguna Sales</h3>
          <Select onValueChange={onSelectSalesUser} value={selectedSalesUser?.uid || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih anggota Sales" />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map(user => (
                <SelectItem key={user.uid} value={user.uid}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-2">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground px-2">Obrolan WhatsApp</h3>
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <Loader2 className="animate-spin" />
              {loadingMessage && <p className="mt-2 text-sm text-muted-foreground">{loadingMessage}</p>}
            </div>
          )}
          {error && <Alert variant="destructive" className="m-2"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {!isLoading && !error && chats.length === 0 && selectedSalesUser && (
            <p className="p-4 text-sm text-center text-muted-foreground">Tidak ada obrolan WhatsApp yang ditemukan untuk pengguna ini.</p>
          )}
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
            >
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={chat.profilePicUrl} />
                <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="font-semibold">{chat.name}</p>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage?.body}</p>
              </div>
              {chat.timestamp && (
                <p className="text-xs text-muted-foreground self-start">
                  {formatDistanceToNow(new Date(chat.timestamp * 1000), { addSuffix: true })}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// MessageBubble component
function MessageBubble({ message }: { message: WahaMessage }) {
    const renderContent = () => {
        if (!message.hasMedia) {
            return <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>;
        }

        let icon;
        let mediaText = message.fileName;

        switch (message.mediaType) {
            case 'image':
                icon = <ImageIcon className="h-5 w-5 mr-2 flex-shrink-0" />;
                if (!mediaText) mediaText = 'Image';
                break;
            case 'video':
                icon = <Video className="h-5 w-5 mr-2 flex-shrink-0" />;
                if (!mediaText) mediaText = 'Video';
                break;
            case 'ptt':
            case 'audio':
                icon = <Headphones className="h-5 w-5 mr-2 flex-shrink-0" />;
                if (!mediaText) mediaText = 'Audio';
                break;
            case 'document':
            default:
                icon = <FileText className="h-5 w-5 mr-2 flex-shrink-0" />;
                if (!mediaText) mediaText = 'File';
                // Handle <file:...> case
                if (message.body.startsWith('<file:')) {
                    mediaText = message.body.substring(6, message.body.length - 1);
                }
                break;
        }
        
        // The body is treated as a caption, but not if it's just the file placeholder
        const caption = message.body && !message.body.startsWith('<file:') ? message.body : null;

        return (
            <div className="space-y-1.5">
                <div className="flex items-center rounded-md bg-black/5 dark:bg-white/10 p-2">
                    {icon}
                    <span className="flex-1 break-all text-sm font-medium">{mediaText}</span>
                </div>
                {caption && <p className="text-sm">{caption}</p>}
            </div>
        );
    };

    return (
        <div className={cn('flex items-end gap-2', message.fromMe ? 'justify-end' : 'justify-start')}>
            <div className={cn(
                'max-w-xs rounded-lg px-3 py-2 md:max-w-md',
                message.fromMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
                {renderContent()}
                {message.timestamp > 0 && (
                    <p className={cn(
                        "text-right text-xs mt-1",
                        message.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                        {format(new Date(message.timestamp * 1000), 'HH:mm')}
                    </p>
                )}
            </div>
        </div>
    );
}

// ChatWindow component (Right Panel)
function ChatWindow({
  chat,
  messages,
  isLoading,
  error,
  searchTerm,
  onSearchChange,
}: {
  chat: WahaChat | null;
  messages: WahaMessage[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/50">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="mx-auto h-12 w-12" />
          <p className="mt-4 text-lg font-medium">Pilih pengguna dan obrolan untuk melihat pesan</p>
          <p>Ini adalah tampilan baca-saja untuk tujuan pemantauan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b p-3 pr-4">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={chat.profilePicUrl} />
          <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{chat.name}</p>
          <p className="text-sm text-muted-foreground">{chat.isGroup ? 'Group Chat' : 'Direct Message'}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari pesan..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-48 pl-10 md:w-64"
          />
        </div>
      </header>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {isLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {error && <Alert variant="destructive" className="m-4"><ServerCrash className="h-4 w-4" /><AlertTitle>Gagal memuat pesan</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {!isLoading && !error && messages.length === 0 && (
             <p className="p-4 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Tidak ada pesan yang cocok dengan pencarian Anda.' : 'Tidak ada pesan di obrolan ini.'}
            </p>
          )}
          {!isLoading && !error && messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">Ini adalah tampilan baca-saja. Membalas tidak tersedia.</p>
      </div>
    </div>
  );
}

// Main Page Component
export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [salesUsers, setSalesUsers] = React.useState<User[]>([]);
  const [selectedSalesUser, setSelectedSalesUser] = React.useState<User | null>(null);
  const [wahaChats, setWahaChats] = React.useState<WahaChat[]>([]);
  const [chatsLoading, setChatsLoading] = React.useState(false);
  const [chatsError, setChatsError] = React.useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = React.useState<string | null>(null);

  const [selectedChat, setSelectedChat] = React.useState<WahaChat | null>(null);
  const [wahaMessages, setWahaMessages] = React.useState<WahaMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [messagesError, setMessagesError] = React.useState<string | null>(null);

  const [messageSearchTerm, setMessageSearchTerm] = React.useState('');
  const [filteredMessages, setFilteredMessages] = React.useState<WahaMessage[]>([]);

  React.useEffect(() => {
    async function fetchSalesUsers() {
      if (user?.role !== 'HEAD_SALES') return;
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'SALES'));
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      setSalesUsers(fetchedUsers);
    }
    fetchSalesUsers();
  }, [user]);

  React.useEffect(() => {
    const abortController = new AbortController();

    async function fetchWahaChats() {
      setWahaChats([]);
      setSelectedChat(null);
      setWahaMessages([]);
      setChatsError(null);

      if (!selectedSalesUser) return;
      
      if (!selectedSalesUser.wahaSessionName || selectedSalesUser.wahaSessionName.trim() === '') {
        setChatsError(`Session WAHA belum dikaitkan ke user ini: ${selectedSalesUser.name}`);
        return;
      }
      
      const sessionName = selectedSalesUser.wahaSessionName;

      setChatsLoading(true);
      setLoadingMessage(`Mencoba terhubung ke sesi '${sessionName}'...`);

      const MAX_RETRIES = 5;
      const RETRY_DELAY = 4000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (abortController.signal.aborted) return;

        try {
          const response = await fetch(`/api/integrations/waha/chats?sessionName=${sessionName}`, { signal: abortController.signal });
          
          const result: WahaApiResponse = await response.json();

          if (result.ok) {
            // SUCCESS: Response is ok, now check data format
            if (Array.isArray(result.data)) {
                const sortedChats = result.data.sort((a: WahaChat, b: WahaChat) => (b.timestamp || 0) - (a.timestamp || 0));
                setWahaChats(sortedChats);
            } else {
                // Response is OK, but data is not an array. Could be an empty state for a new user.
                setWahaChats([]);
            }
            setChatsError(null);
            setLoadingMessage(null);
            setChatsLoading(false);
            return; // Exit loop on success
          }

          // HANDLE ERRORS AND RETRIES
          if (!result.ok && result.status === 404) {
             if (attempt === MAX_RETRIES) {
              throw new Error(`Sesi '${sessionName}' tidak merespon setelah beberapa kali percobaan. Pastikan sesi berjalan dengan benar di layanan WAHA.`);
            }
            setLoadingMessage(`Sesi ditemukan, menunggu sinkronisasi obrolan... (Percobaan ${attempt}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          } else {
            const errorMessage = result.hint || `Gagal mengambil obrolan untuk sesi '${sessionName}'. Pastikan nama sesi sudah benar di Manajemen Pengguna dan sesi tersebut telah sepenuhnya terhubung dan siap di WAHA.`;
            throw new Error(errorMessage);
          }
        } catch (err: any) {
           if (err.name === 'AbortError') {
             console.log('Fetch for chats aborted.');
             return;
           }
           if (err instanceof SyntaxError) { // Catches JSON parsing errors
            setChatsError("Gagal mem-parsing respons dari WAHA. Layanan mungkin sedang tidak aktif atau mengembalikan format yang tidak valid.");
           } else {
            setChatsError(err.message);
           }
           setChatsLoading(false);
           setLoadingMessage(null);
           return;
        }
      }
    }
    
    fetchWahaChats();

    return () => {
      abortController.abort();
    };
  }, [selectedSalesUser]);

  React.useEffect(() => {
    async function fetchWahaMessages() {
        setWahaMessages([]);
        if (!selectedChat || !selectedSalesUser?.wahaSessionName) {
            return;
        };

      setMessagesLoading(true);
      setMessagesError(null);
      try {
        const response = await fetch(`/api/integrations/waha/messages?sessionName=${selectedSalesUser.wahaSessionName}&chatId=${selectedChat.id}`);
        const result: WahaApiResponse = await response.json();
        
        if (result.ok && Array.isArray(result.data)) {
           setWahaMessages(result.data.reverse()); // WAHA often returns newest first
        } else {
          let errorMessage = result.hint || 'Terjadi kesalahan tidak dikenal saat mengambil pesan.';
          if (result.data && (result.data.message || result.data.error)) {
             errorMessage = `WAHA Error: ${result.data.message || result.data.error}`;
          }
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        setMessagesError(err.message);
      } finally {
        setMessagesLoading(false);
      }
    }
    fetchWahaMessages();
  }, [selectedChat, selectedSalesUser]);

  React.useEffect(() => {
    if (!messageSearchTerm) {
      setFilteredMessages(wahaMessages);
    } else {
      const lowercasedQuery = messageSearchTerm.toLowerCase();
      const filtered = wahaMessages.filter(message =>
        message.body?.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredMessages(filtered);
    }
  }, [messageSearchTerm, wahaMessages]);


  const handleSelectSalesUser = (userId: string) => {
    const user = salesUsers.find(u => u.uid === userId) || null;
    setSelectedSalesUser(user);
  };

  const handleSelectChat = (chatId: string) => {
    const chat = wahaChats.find(c => c.id === chatId) || null;
    setSelectedChat(chat);
    setMessageSearchTerm(''); // Reset search on new chat selection
  }

  if (authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="h-[calc(100vh_-_100px)] w-full overflow-hidden">
      <CardContent className="h-full p-0">
        <div className="grid h-full grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="border-r h-full overflow-y-auto">
            <ChatList
              salesUsers={salesUsers}
              onSelectSalesUser={handleSelectSalesUser}
              selectedSalesUser={selectedSalesUser}
              chats={wahaChats}
              onSelectChat={handleSelectChat}
              isLoading={chatsLoading}
              error={chatsError}
              loadingMessage={loadingMessage}
            />
          </div>
          <div className="h-full overflow-hidden">
            <ChatWindow
              chat={selectedChat}
              messages={filteredMessages}
              isLoading={messagesLoading}
              error={messagesError}
              searchTerm={messageSearchTerm}
              onSearchChange={setMessageSearchTerm}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
