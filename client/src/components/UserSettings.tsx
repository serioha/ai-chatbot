import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "./AuthProvider";

export default function UserSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState<string>(theme);
  const [aiModel, setAiModel] = useState<string>("openai:gpt-3.5-turbo");
  const [displayName, setDisplayName] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const { toast } = useToast();

  const settingsQuery = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });
  
  const modelsQuery = useQuery<{id: string, name: string, provider: string}[]>({
    queryKey: ["/api/models"],
  });

  // Regular settings update mutation that shows a toast and closes the dialog
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { theme?: string; aiModel?: string }) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update settings",
        description: error.message,
      });
    },
  });
  
  // Silent update mutation for theme buttons (no toast, no dialog close)
  const silentUpdateMutation = useMutation({
    mutationFn: async (data: { theme?: string }) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      console.error("Error updating theme:", error);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSelectedTheme(settingsQuery.data.theme);
      setAiModel(settingsQuery.data.aiModel);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    } else if (user?.username) {
      setDisplayName(user.username);
    }
  }, [user]);

  const handleSave = () => {
    // Apply theme immediately
    setTheme(selectedTheme as "light" | "dark" | "system");
    
    // Save settings to server
    updateSettingsMutation.mutate({
      theme: selectedTheme,
      aiModel,
    });
  };

  const handleClearConversations = () => {
    // This functionality would require a backend endpoint to clear conversations
    toast({
      title: "Not implemented",
      description: "This feature is not implemented yet.",
    });
  };

  const getUserInitials = () => {
    if (!user) return "U";
    
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    
    return user.username.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your experience and manage your account
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <div className="overflow-y-auto pr-1 max-h-[55vh]">
            {/* Profile Tab - Personal details and preferences */}
            <TabsContent value="profile" className="space-y-6 py-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-medium text-lg">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            {/* Theme Setting */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={selectedTheme === "light" ? "default" : "outline"}
                  className="py-2 px-3 rounded-md text-center text-sm"
                  onClick={() => {
                    setSelectedTheme("light");
                    setTheme("light");
                    silentUpdateMutation.mutate({ theme: "light" });
                  }}
                >
                  Light
                </Button>
                <Button
                  variant={selectedTheme === "dark" ? "default" : "outline"}
                  className="py-2 px-3 rounded-md text-center text-sm"
                  onClick={() => {
                    setSelectedTheme("dark");
                    setTheme("dark");
                    silentUpdateMutation.mutate({ theme: "dark" });
                  }}
                >
                  Dark
                </Button>
                <Button
                  variant={selectedTheme === "system" ? "default" : "outline"}
                  className="py-2 px-3 rounded-md text-center text-sm"
                  onClick={() => {
                    setSelectedTheme("system");
                    setTheme("system");
                    silentUpdateMutation.mutate({ theme: "system" });
                  }}
                >
                  System
                </Button>
              </div>
            </div>

            {/* AI Model Setting */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Default AI Model</Label>
              <Select
                value={aiModel}
                onValueChange={setAiModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsQuery.isLoading ? (
                    <SelectItem value="loading">Loading models...</SelectItem>
                  ) : modelsQuery.error ? (
                    <SelectItem value="error">Error loading models</SelectItem>
                  ) : modelsQuery.data && modelsQuery.data.length > 0 ? (
                    modelsQuery.data.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-models">No models available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Language Setting */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Language</Label>
              <Select
                value={language}
                onValueChange={setLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Changes the interface language (not fully implemented)
              </p>
            </div>
          </TabsContent>
          
          {/* Account Tab - Security and data management */}
          <TabsContent value="account" className="space-y-6 py-4">
            {/* Account Security */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Account Security</Label>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password" className="text-xs text-muted-foreground mb-1 block">
                    Current Password
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="••••••••"
                    disabled={true}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password changes are not available in this version
                  </p>
                </div>
              </div>
            </div>

            {/* Message History */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Data Management</Label>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div>
                  <span className="text-sm font-medium block">Clear all conversations</span>
                  <span className="text-xs text-muted-foreground">This action cannot be undone</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearConversations}
                >
                  Clear data
                </Button>
              </div>
            </div>

            {/* Export Data */}
            <div>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div>
                  <span className="text-sm font-medium block">Export your data</span>
                  <span className="text-xs text-muted-foreground">Download all your conversations</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Not implemented",
                      description: "This feature is not implemented yet.",
                    });
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
            
            {/* Current Plan */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Your Current Plan</Label>
              <div className="border rounded-md p-4 mb-2">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-md">Free Plan</h4>
                    <p className="text-sm text-muted-foreground">Basic features</p>
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
                    CURRENT
                  </div>
                </div>
                <ul className="space-y-1.5 my-3">
                  <li className="text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Basic AI models
                  </li>
                  <li className="text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Limited conversation history
                  </li>
                  <li className="text-sm flex items-center text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Access to advanced models
                  </li>
                </ul>
                <Select
                  value={currentPlan}
                  onValueChange={setCurrentPlan}
                  disabled
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free Plan</SelectItem>
                    <SelectItem value="pro">Pro Plan</SelectItem>
                    <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Upgrade functionality not available in this version
                </p>
              </div>
            </div>
            
            {/* Delete Account */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-destructive font-medium text-sm mb-2">Danger Zone</h3>
              <div className="flex items-center justify-between bg-destructive/10 p-3 rounded-md">
                <div>
                  <span className="text-sm font-medium text-destructive block">Delete Account</span>
                  <span className="text-xs text-muted-foreground">Permanently delete your account and all data</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Not implemented",
                      description: "Account deletion is not available in this version.",
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
