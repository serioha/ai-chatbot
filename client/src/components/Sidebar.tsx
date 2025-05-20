import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import ConversationList from "./ConversationList";
import UserSettingsDialog from "./UserSettings";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Settings, LogOut, Sun, Moon } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Sidebar({
  isMobileOpen,
  onCloseMobile,
}: {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [_, setLocation] = useLocation();
  
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation",
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/chat/${data.id}`);
      onCloseMobile();
    },
  });
  
  const handleNewChat = () => {
    // Navigate to the base chat URL, which will show the welcome screen
    setLocation('/chat');
    onCloseMobile();
  };
  
  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };
  
  const userInitials = user?.name
    ? `${user.name.split(" ").map((n) => n[0]).join("")}`
    : user?.username?.substring(0, 2).toUpperCase() || "?";
  
  // Handle click outside of sidebar
  const handleBackdropClick = () => {
    // This is triggered when the backdrop is clicked
    onCloseMobile();
  };

  // Toggle theme function with database update
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Update local theme state
    setTheme(newTheme);
    
    // Update theme in database
    const updateThemeInDatabase = async () => {
      try {
        await apiRequest("PATCH", "/api/settings", {
          theme: newTheme
        });
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      } catch (error) {
        console.error("Failed to update theme in database:", error);
      }
    };
    
    updateThemeInDatabase();
  };

  return (
    <>
      {/* Dark overlay behind sidebar on mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}
      
      <aside
        className={`w-72 bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] flex-shrink-0 h-full transition-transform duration-300 transform ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static z-30 left-0 top-0 border-r border-border flex flex-col`}
      >
        <div className="p-4 flex flex-col h-full overflow-hidden">
          {/* Conversation list with overflow */}
          <div className="flex-1 overflow-hidden">
            <ConversationList onNewChat={handleNewChat} />
          </div>
          
          <Separator className="my-4" />
          
          {/* User info and actions */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">{userInitials}</span>
                </div>
                <div>
                  <div className="text-sm font-medium">{user?.name || user?.username}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Theme toggle button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}