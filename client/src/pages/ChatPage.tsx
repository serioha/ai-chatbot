import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import MessageInput from "@/components/MessageInput";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

export default function ChatPage() {
  const params = useParams<{ id?: string }>();
  // Parse the id and ensure it's a valid number
  const conversationId = params.id && !isNaN(parseInt(params.id)) ? parseInt(params.id) : null;
  const [location, setLocation] = useLocation();
  const isMobile = useMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // Log for debugging
  console.log("Current conversation ID:", conversationId);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location, isMobile]);

  // Open sidebar by default on desktop
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // This function is called when the message is being sent
  // and we're waiting for the AI to respond
  const handleTypingStart = () => {
    console.log("Starting typing indicator");
    setIsTyping(true);
  };

  // This function is called when the AI response
  // has been received and we're ready to show the response
  const handleTypingEnd = () => {
    console.log("Ending typing indicator");
    setIsTyping(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <Button
          className="lg:hidden fixed z-40 top-4 right-4 bg-transparent hover:bg-muted/50 text-foreground dark:text-muted-foreground rounded-full p-3 shadow-md"
          size="icon"
          variant="ghost"
          aria-label="Toggle sidebar"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}

      {/* Sidebar - hidden on mobile unless toggled */}
      <Sidebar isMobileOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-grow overflow-hidden flex flex-col bg-background">
        <ChatArea 
          conversationId={conversationId} 
          isTyping={isTyping}
          onTypingEnd={handleTypingEnd}
        />
        <MessageInput
          conversationId={conversationId}
          onTypingStart={handleTypingStart}
          onTypingEnd={handleTypingEnd}
        />
      </div>
    </div>
  );
}
