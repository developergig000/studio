'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { User, Chat, Message } from '@/lib/types';
import { collection, query, where, getDocs, doc, onSnapshot, orderBy, addDoc, serverTimestamp, setDoc, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Helper function to get user initials
function getInitials(name?: string | null) {
  return name?.split(' ').map((n) => n[0]).join('') || 'U';
}

// ChatList component (Left Panel)
function ChatList({
  currentUser,
  onSelectChat,
}: {
  currentUser: User;
  onSelectChat: (recipient: User) => void;
}) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchChatsAndUsers = async () => {
      setLoading(true);
      if (currentUser.role === 'HEAD_SALES') {
        // HEAD_SALES sees all conversations
        const chatsQuery = query(collection(db, 'chats'), orderBy('lastMessageTimestamp', 'desc'));
        const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
          const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
          setChats(fetchedChats);
          setLoading(false);
        });
        return unsubscribe;
      } else {
        // SALES sees other SALES users to chat with
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'SALES'), where('uid', '!=', currentUser.uid));
        const snapshot = await getDocs(usersQuery);
        const fetchedUsers = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
        setUsers(fetchedUsers);
        setLoading(false);
      }
    };

    const unsubscribePromise = fetchChatsAndUsers();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [currentUser]);

  if (loading) {
    return <div className="p-4 text-center">Loading chats...</div>;
  }

  const handleSelectHeadSalesChat = async (chat: Chat) => {
    // For HEAD_SALES, we need to create a "fake" user object for the recipient to pass to onSelectChat
    // We pick one of the participants to act as the "recipient" to establish the chat window.
    // The ChatWindow component will know to display all participants' info.
    const recipientId = chat.participants.find(p => p !== currentUser.uid) || chat.participants[0];
    if (recipientId) {
      const userDoc = await getDoc(doc(db, 'users', recipientId));
      if (userDoc.exists()) {
        onSelectChat({ ...userDoc.data(), uid: userDoc.id } as User);
      }
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-2">
        {currentUser.role === 'SALES' && users.map(user => (
          <button
            key={user.uid}
            onClick={() => onSelectChat(user)}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
          >
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">Sales Team</p>
            </div>
          </button>
        ))}
        {currentUser.role === 'HEAD_SALES' && chats.map(chat => {
          return (
            <button
              key={chat.id}
              onClick={() => handleSelectHeadSalesChat(chat)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
            >
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className='text-xs'>
                  {Object.values(chat.participantNames).map(name => getInitials(name)).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="font-semibold">{Object.values(chat.participantNames).join(' & ')}</p>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessageText}</p>
              </div>
              {chat.lastMessageTimestamp && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true })}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </ScrollArea>
  );
}

// MessageBubble component
function MessageBubble({ message, isOwnMessage }: { message: Message; isOwnMessage: boolean }) {
  return (
    <div className={cn('flex items-end gap-2', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-xs rounded-lg px-3 py-2 md:max-w-md',
          isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="text-sm">{message.text}</p>
        <p className={cn('mt-1 text-xs opacity-70', isOwnMessage ? 'text-right' : 'text-left')}>
          {message.timestamp ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true }) : ''}
        </p>
      </div>
    </div>
  );
}

// ChatWindow component (Right Panel)
function ChatWindow({ currentUser, recipient }: { currentUser: User; recipient: User | null }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [chatHeader, setChatHeader] = React.useState<{name: string, description: string}>({name: '', description: ''});
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (currentUser && recipient) {
      const newChatId = [currentUser.uid, recipient.uid].sort().join('_');
      setChatId(newChatId);
    }
  }, [currentUser, recipient]);

  React.useEffect(() => {
    if (!chatId) return;

    const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(fetchedMessages);
    });

    return unsubscribe;
  }, [chatId]);
  
  React.useEffect(() => {
    const setupHeader = async () => {
        if (!recipient) return;
        if(currentUser.role === 'HEAD_SALES' && chatId) {
            const chatDoc = await getDoc(doc(db, 'chats', chatId));
            if(chatDoc.exists()) {
                const chatData = chatDoc.data() as Chat;
                setChatHeader({
                    name: Object.values(chatData.participantNames).join(' & '),
                    description: 'Conversation between Sales Team'
                });
            }
        } else {
            setChatHeader({
                name: recipient.name || '',
                description: recipient.role === 'SALES' ? 'Sales Team' : ''
            });
        }
    };
    setupHeader();
  }, [recipient, chatId, currentUser.role]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollableNode = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollableNode) {
            scrollableNode.scrollTop = scrollableNode.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !currentUser || !recipient) return;

    const messageData = {
      text: newMessage,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
    };
    
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    
    const chatRef = doc(db, 'chats', chatId);
    const participantNames = {
        [currentUser.uid]: currentUser.name || 'Unknown',
        [recipient.uid]: recipient.name || 'Unknown',
    }

    await setDoc(chatRef, {
        participants: [currentUser.uid, recipient.uid],
        participantNames,
        lastMessageText: newMessage,
        lastMessageTimestamp: serverTimestamp(),
    }, { merge: true });

    setNewMessage('');
  };

  if (!recipient) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/50">
        <div className="text-center">
          <p className="text-lg font-medium">Select a chat to start messaging</p>
          <p className="text-muted-foreground">or start a new conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b p-3">
        <Avatar className="h-10 w-10 border">
          <AvatarFallback>{getInitials(chatHeader.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{chatHeader.name}</p>
          <p className="text-sm text-muted-foreground">{chatHeader.description}</p>
        </div>
      </header>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === currentUser.uid} />
          ))}
        </div>
      </ScrollArea>
      { currentUser.role !== 'HEAD_SALES' && (
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// Main Page Component
export default function ChatPage() {
  const { user, loading } = useAuth();
  const [selectedRecipient, setSelectedRecipient] = React.useState<User | null>(null);

  if (loading || !user) {
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
            <ChatList currentUser={user} onSelectChat={setSelectedRecipient} />
          </div>
          <div className="h-full">
            <ChatWindow currentUser={user} recipient={selectedRecipient} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}