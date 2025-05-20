import { useQuery, useMutation } from "@tanstack/react-query";
import { Conversation } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, SearchIcon, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isBefore,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function ConversationList({ onNewChat }: { onNewChat: () => void }) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted successfully.",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    },
  });

  const filteredConversations = conversationsQuery.data?.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group conversations by time periods
  const groupConversations = (conversations: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Last Week': [],
      'This Month': [],
      'Older': []
    };

    conversations.forEach(conversation => {
      const date = new Date(conversation.updatedAt);
      const now = new Date();
      const lastWeekStart = startOfWeek(now);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      if (isToday(date)) {
        groups['Today'].push(conversation);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(conversation);
      } else if (isThisWeek(date)) {
        groups['This Week'].push(conversation);
      } else if (isBefore(lastWeekStart, date)) {
        groups['Last Week'].push(conversation);
      } else if (isThisMonth(date)) {
        groups['This Month'].push(conversation);
      } else {
        groups['Older'].push(conversation);
      }
    });

    // Filter out empty groups and sort conversations within each group
    return Object.entries(groups)
      .filter(([_, convos]) => convos.length > 0)
      .map(([label, convos]) => ({
        label,
        conversations: convos.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      }));
  };

  const groupedConversations = groupConversations(filteredConversations);

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteConversationMutation.mutate(deletingId);
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Button
        onClick={onNewChat}
        className="flex items-center gap-2 w-full border mb-4"
        variant="outline"
      >
        <PlusIcon className="h-5 w-5" />
        <span>New Chat</span>
      </Button>

      <div className="relative mb-4">
        <Input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8"
        />
        <SearchIcon className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
      </div>

      <div className="flex-grow overflow-y-auto mb-4">
        {conversationsQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-2">
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : conversationsQuery.isError ? (
          <div className="p-2 text-sm text-destructive">Error loading conversations</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            {searchQuery ? "No conversations match your search" : "No conversations yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedConversations.map((group) => (
              <div key={group.label} className="space-y-1">
                <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2 px-1">
                  {group.label}
                </h3>
                <ul className="space-y-1">
                  {group.conversations.map((conversation) => {
                    const currentPath = `/chat/${conversation.id}`;
                    const isActive = location === currentPath;
                    
                    return (
                      <li key={conversation.id}>
                        <div className="relative group">
                          <Link href={currentPath}>
                            <div
                              className={`p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center justify-between ${
                                isActive ? "bg-gray-200 dark:bg-gray-800" : ""
                              }`}
                            >
                              <div className="flex-grow truncate pr-8">
                                <div className="text-sm font-medium">{conversation.title}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                            onClick={(e) => handleDeleteClick(e, conversation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
