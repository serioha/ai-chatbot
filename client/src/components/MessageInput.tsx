import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, SendIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function MessageInput({
  conversationId,
  onTypingStart,
  onTypingEnd,
}: {
  conversationId: number | null;
  onTypingStart: () => void;
  onTypingEnd: () => void;
}) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Set up event listener for Quick Questions
  useEffect(() => {
    const handleQuickQuestionEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.question) {
        setMessage(customEvent.detail.question);
        // Focus the textarea
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };
    
    // Add event listener
    document.addEventListener('quickQuestionSelected', handleQuickQuestionEvent);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('quickQuestionSelected', handleQuickQuestionEvent);
    };
  }, []);

  // Mutation for creating a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/conversations",
        { title: "New Conversation" }
      );
      return response.json();
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to create conversation",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, newConversationId }: { content: string; newConversationId?: number }) => {
      // Use the provided newConversationId (from a newly created conversation) or the existing conversationId
      const targetConversationId = newConversationId || conversationId;
      
      if (!targetConversationId) {
        throw new Error("No conversation selected");
      }
      
      onTypingStart();
      
      const response = await apiRequest(
        "POST",
        `/api/conversations/${targetConversationId}/messages`,
        { content }
      );
      
      return {
        data: await response.json(),
        conversationId: targetConversationId
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${result.conversationId}`] });
      
      // If we created a new conversation, redirect to it using wouter's setLocation
      // instead of a full page refresh which causes flickering
      if (!conversationId && result.conversationId) {
        setLocation(`/chat/${result.conversationId}`);
      }
      
      // Message was successfully sent, just log for debugging
      if (result.data.aiMessage && result.data.aiMessage.id) {
        console.log("AI response received with ID:", result.data.aiMessage.id);
      }
      
      // Once we get a response, immediately stop the typing indicator
      // This will ensure the loader disappears before typing animation starts
      onTypingEnd();
    },
    onError: (error: unknown) => {
      onTypingEnd();
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }
    
    const messageContent = message.trim();
    
    // Start typing animation immediately before API call
    onTypingStart();
    
    // Clear input and reset textarea height immediately
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    
    // If no conversation is selected, create a new one first
    if (!conversationId) {
      createConversationMutation.mutate(undefined, {
        onSuccess: (newConversation) => {
          // Add the user message to the conversation immediately (optimistic update)
          const optimisticUserMessage = {
            id: -1, // temporary ID
            conversationId: newConversation.id,
            content: messageContent,
            role: 'user',
            createdAt: new Date(),
          };
          
          // Update cache with optimistic update
          queryClient.setQueryData(
            [`/api/conversations/${newConversation.id}`],
            (oldData: any) => {
              if (!oldData) {
                return {
                  id: newConversation.id,
                  title: newConversation.title,
                  userId: newConversation.userId,
                  createdAt: newConversation.createdAt,
                  updatedAt: newConversation.updatedAt,
                  messages: [optimisticUserMessage]
                };
              }
              
              return {
                ...oldData,
                messages: [...(oldData.messages || []), optimisticUserMessage]
              };
            }
          );
          
          // After optimistic update, redirect to the new conversation
          setLocation(`/chat/${newConversation.id}`);
          
          // Then send the message to API
          sendMessageMutation.mutate({ 
            content: messageContent, 
            newConversationId: newConversation.id 
          });
        },
        onError: () => {
          // If conversation creation fails, stop typing animation
          onTypingEnd();
        }
      });
    } else {
      // Add the user message to the conversation immediately (optimistic update)
      const optimisticUserMessage = {
        id: -1, // temporary ID
        conversationId: conversationId,
        content: messageContent,
        role: 'user',
        createdAt: new Date(),
      };
      
      // Update cache with optimistic update
      queryClient.setQueryData(
        [`/api/conversations/${conversationId}`],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            messages: [...(oldData.messages || []), optimisticUserMessage]
          };
        }
      );
      
      // Then send message to existing conversation
      sendMessageMutation.mutate({ content: messageContent });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="border-t p-4">
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <div className="flex-grow relative rounded-lg border bg-background overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition">
          <Textarea
            id="message-input"
            ref={textareaRef}
            rows={1}
            placeholder="Type your message..."
            className="min-h-[44px] max-h-[200px] resize-none py-3 px-4 overflow-y-auto"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessageMutation.isPending}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={sendMessageMutation.isPending}
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg p-3 h-[44px] w-[44px]"
          disabled={!message.trim() || sendMessageMutation.isPending || createConversationMutation.isPending}
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
