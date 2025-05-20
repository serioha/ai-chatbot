import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Conversation, Message } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import MessageItem from "./MessageItem";
import { useAuth } from "./AuthProvider";
import { PencilIcon, CheckIcon, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Define a custom message type for API responses
type MessageWithStringOrDateCreatedAt = Omit<Message, 'createdAt'> & {
  createdAt: string | Date;
};

type ChatContentProps = {
  conversationId: number;
  isLoadingMessages: boolean;
  messages: MessageWithStringOrDateCreatedAt[];
  userAvatar: string;
  isTyping: boolean;
};

function ChatContent({ 
  conversationId, 
  isLoadingMessages, 
  messages, 
  userAvatar,
  isTyping,
  onTypingAnimationStart
}: ChatContentProps & { onTypingAnimationStart?: () => void }) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [animatedMessageId, setAnimatedMessageId] = useState<number | null>(null);
  const prevMessagesRef = useRef<MessageWithStringOrDateCreatedAt[]>([]);
  const conversationIdRef = useRef<number | null>(null);

  // Reset animation state when switching conversations
  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      // Clear animation state when switching conversations
      setAnimatedMessageId(null);
      prevMessagesRef.current = [];
      conversationIdRef.current = conversationId;
    }
  }, [conversationId]);

  // Track new AI messages to apply typing animation only to the newest one
  useEffect(() => {
    // Skip animation on initial load
    if (prevMessagesRef.current.length === 0 && messages.length > 0) {
      prevMessagesRef.current = [...messages];
      return;
    }
    
    // If we have new messages
    if (messages.length > prevMessagesRef.current.length) {
      // Find new messages since the last update
      const newMessages = messages.slice(prevMessagesRef.current.length);
      
      // Find the latest AI message (if any)
      const newAiMessages = newMessages.filter(m => m.role === 'assistant');
      
      if (newAiMessages.length > 0) {
        // Get the latest AI message ID
        const latestAiMessageId = newAiMessages[newAiMessages.length - 1].id;
        // Set it as the only animated message
        setAnimatedMessageId(latestAiMessageId);
      }
      
      // Update reference to current messages
      prevMessagesRef.current = [...messages];
    }
  }, [messages]);
  
  // Handle typing completion for a message
  const handleTypingComplete = (messageId: number) => {
    // Clear animation when typing is complete
    if (messageId === animatedMessageId) {
      setAnimatedMessageId(null);
    }
  };
  
  // We don't need this cleanup effect for now
  

  // Scroll to bottom when messages change or when new messages are added
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, messages.length]);

  if (isLoadingMessages) {
    return (
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-24 w-3/4 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <div className="flex justify-center mb-8 mt-8">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
        </div>

        <div className="text-center max-w-md mx-auto mb-8">
          <h2 className="text-2xl font-bold mb-2">ChatGPT</h2>
          <p className="text-muted-foreground mb-6">
            Ask me anything about programming, science, or any topic you're curious about!
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              variant="outline"
              className="text-left text-sm h-auto py-3 justify-start"
              onClick={() => {
                const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                if (textarea) {
                  textarea.value = "Explain quantum computing in simple terms";
                  textarea.focus();
                }
              }}
            >
              "Explain quantum computing in simple terms"
            </Button>
            <Button
              variant="outline"
              className="text-left text-sm h-auto py-3 justify-start"
              onClick={() => {
                const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                if (textarea) {
                  textarea.value = "Write a JavaScript function to sort an array";
                  textarea.focus();
                }
              }}
            >
              "Write a JavaScript function to sort an array"
            </Button>
            <Button
              variant="outline"
              className="text-left text-sm h-auto py-3 justify-start"
              onClick={() => {
                const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                if (textarea) {
                  textarea.value = "What are the best practices for React development?";
                  textarea.focus();
                }
              }}
            >
              "What are the best practices for React development?"
            </Button>
            <Button
              variant="outline"
              className="text-left text-sm h-auto py-3 justify-start"
              onClick={() => {
                const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                if (textarea) {
                  textarea.value = "How does machine learning work?";
                  textarea.focus();
                }
              }}
            >
              "How does machine learning work?"
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-grow overflow-y-auto p-4 space-y-6" 
      id="chat-messages"
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          userAvatar={userAvatar}
          isNew={message.role === 'assistant' && message.id === animatedMessageId}
          onTypingComplete={handleTypingComplete}
        />
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
}

type ChatHeaderProps = {
  title: string;
  isEditing: boolean;
  newTitle: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function ChatHeader({
  title,
  isEditing,
  newTitle,
  onEdit,
  onSave,
  onCancel,
  onTitleChange,
}: ChatHeaderProps) {
  return (
    <header className="border-b p-4 flex items-center justify-between">
      <div className="flex items-center">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              className="h-8"
              value={newTitle}
              onChange={onTitleChange}
              placeholder="Conversation title"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSave}
              aria-label="Save title"
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCancel}
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <h1 className="text-xl font-semibold truncate max-w-[300px] sm:max-w-[500px]">
              {title}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-8 w-8"
              onClick={onEdit}
              aria-label="Edit title"
            >
              <PencilIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

export default function ChatArea({
  conversationId,
  isTyping,
  onTypingEnd,
}: {
  conversationId: number | null;
  isTyping: boolean;
  onTypingEnd?: () => void;
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { toast } = useToast();

  const userAvatar = user?.name
    ? `${user.name.split(" ").map((n) => n[0]).join("")}`
    : user?.username.substring(0, 2).toUpperCase() || "?";

  // Fetch conversation data with more debug info
  type ConversationWithMessages = {
    id: number;
    title: string;
    userId: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    messages: MessageWithStringOrDateCreatedAt[];
  };

  const conversationQuery = useQuery<ConversationWithMessages>({
    queryKey: conversationId ? [`/api/conversations/${conversationId}`] : ["/api/conversations"],
    enabled: !!conversationId,
    staleTime: 1000, // reduce unnecessary refetches
    refetchOnWindowFocus: false,
  });

  // Log error manually if there is one
  if (conversationQuery.error) {
    console.error("Error fetching conversation:", conversationQuery.error);
  }

  useEffect(() => {
    if (conversationQuery.data) {
      setNewTitle(conversationQuery.data.title);
    }
  }, [conversationQuery.data]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!conversationId || !newTitle.trim()) return;

    try {
      await apiRequest("PATCH", `/api/conversations/${conversationId}`, {
        title: newTitle.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      setIsEditing(false);
      toast({
        title: "Title updated",
        description: "Conversation title has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update title: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const handleCancel = () => {
    if (conversationQuery.data) {
      setNewTitle(conversationQuery.data.title);
    }
    setIsEditing(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTitle(e.target.value);
  };

  if (!conversationId) {
    return (
      <main className="flex-grow overflow-hidden flex flex-col bg-background">
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center max-w-xl w-full">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">Welcome to Chat</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Choose an existing conversation from the sidebar or start a new one to begin chatting with AI assistants.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Supports multiple AI models including OpenAI, Google Gemini, and Mistral.
            </p>

            <h3 className="text-lg font-medium mb-3">Quick Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <Button
                variant="outline"
                className="text-left text-sm h-auto py-3 justify-start font-normal whitespace-normal"
                onClick={() => {
                  // Use the global function to update the React state directly
                  const setQuickQuestion = (window as any).setQuickQuestion;
                  if (setQuickQuestion) {
                    setQuickQuestion("Explain quantum computing in simple terms");
                    
                    // Focus the textarea
                    const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.focus();
                    }
                  }
                }}
              >
                "Explain quantum computing in simple terms"
              </Button>
              <Button
                variant="outline"
                className="text-left text-sm h-auto py-3 justify-start font-normal whitespace-normal"
                onClick={() => {
                  // Use the global function to update the React state directly
                  const setQuickQuestion = (window as any).setQuickQuestion;
                  if (setQuickQuestion) {
                    setQuickQuestion("Write a JavaScript function to sort an array");
                    
                    // Focus the textarea
                    const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.focus();
                    }
                  }
                }}
              >
                "Write a JavaScript function to sort an array"
              </Button>
              <Button
                variant="outline"
                className="text-left text-sm h-auto py-3 justify-start font-normal whitespace-normal"
                onClick={() => {
                  // Use the global function to update the React state directly
                  const setQuickQuestion = (window as any).setQuickQuestion;
                  if (setQuickQuestion) {
                    setQuickQuestion("What are the best practices for React development?");
                    
                    // Focus the textarea
                    const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.focus();
                    }
                  }
                }}
              >
                "What are the best practices for React development?"
              </Button>
              <Button
                variant="outline"
                className="text-left text-sm h-auto py-3 justify-start font-normal whitespace-normal"
                onClick={() => {
                  // Use the global function to update the React state directly
                  const setQuickQuestion = (window as any).setQuickQuestion;
                  if (setQuickQuestion) {
                    setQuickQuestion("How does machine learning work?");
                    
                    // Focus the textarea
                    const textarea = document.getElementById("message-input") as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.focus();
                    }
                  }
                }}
              >
                "How does machine learning work?"
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Extract messages from the query response
  const messages = conversationQuery.data?.messages || [];
  const title = conversationQuery.data?.title || "Loading...";
  const isLoadingMessages = conversationQuery.isLoading;
  
  // We'll use the latestMessageId passed from the parent component

  return (
    <main className="flex-grow overflow-hidden flex flex-col bg-background">
      <ChatHeader
        title={title}
        isEditing={isEditing}
        newTitle={newTitle}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onTitleChange={handleTitleChange}
      />

      <div className="flex-grow overflow-y-auto">
        <ChatContent
          conversationId={conversationId}
          isLoadingMessages={isLoadingMessages}
          messages={messages}
          userAvatar={userAvatar}
          isTyping={isTyping}
        />

        {isTyping && (
          <div className="flex items-start gap-4 p-4 mx-4 mb-4">
            <div className="h-8 w-8 bg-secondary dark:bg-gray-600 text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="px-4 py-3 rounded-lg bg-secondary/30 dark:bg-gray-800/50">
              <div className="typing-animation">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
