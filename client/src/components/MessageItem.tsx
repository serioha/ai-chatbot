import { useState, useEffect, useRef } from "react";
import { Message } from "@shared/schema";

// Define a custom message type for the component
type MessageWithStringOrDateCreatedAt = Omit<Message, 'createdAt'> & {
  createdAt: string | Date;
  isNew?: boolean;
};
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function MessageItem({
  message,
  userAvatar,
  isNew = false,
  onTypingComplete,
}: {
  message: MessageWithStringOrDateCreatedAt;
  userAvatar: string;
  isNew?: boolean;
  onTypingComplete?: (messageId: number) => void;
}) {
  const isUser = message.role === "user";
  
  // Extract quick questions from AI responses
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const [cleanContent, setCleanContent] = useState<string>("");
  
  // Process the content to extract quick questions
  useEffect(() => {
    if (isUser) {
      setCleanContent(message.content);
      return;
    }
    
    const content = message.content;
    
    // Extract quick questions if they exist
    const quickQuestionsMatch = content.match(/<QUICK_QUESTIONS>([\s\S]*?)<\/QUICK_QUESTIONS>/);
    
    if (quickQuestionsMatch && quickQuestionsMatch[1]) {
      // Get the text between the tags and split by newlines to get individual questions
      const questionsText = quickQuestionsMatch[1].trim();
      const questions = questionsText.split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);
      
      setQuickQuestions(questions);
      
      // Remove the quick questions section from the displayed content
      const cleanedContent = content.replace(/<QUICK_QUESTIONS>[\s\S]*?<\/QUICK_QUESTIONS>/, '').trim();
      setCleanContent(cleanedContent);
    } else {
      setCleanContent(content);
      setQuickQuestions([]);
    }
  }, [message.content, isUser]);
  
  const fullContent = cleanContent;
  const [displayedContent, setDisplayedContent] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingSpeed = useRef<number>(15); // milliseconds per character - adjust for speed
  const plainTextContent = useRef<string>(""); // Initialize as empty string and update in useEffect
  
  // Initialize or reset when message or isNew changes
  useEffect(() => {
    // If it's a user message, show it immediately
    if (isUser) {
      setDisplayedContent(fullContent);
      return;
    }
    
    // If it's a new AI message, start with empty string to begin typing animation
    if (isNew) {
      setDisplayedContent("");
      setIsTyping(true);
    } else {
      // For history AI messages, show full content immediately
      setDisplayedContent(fullContent);
      setIsTyping(false);
    }
  }, [isUser, isNew, message.id]);
  
  // Update plainTextContent when fullContent changes
  useEffect(() => {
    plainTextContent.current = fullContent.replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/```[\s\S]*?```/g, '(code block)')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s/g, '');
  }, [fullContent]);

  // Handle typing animation
  useEffect(() => {
    if (isTyping && !isUser) {
      let i = 0;
      const timer = setInterval(() => {
        if (i <= plainTextContent.current.length) {
          // Use the plain text version for typing animation
          setDisplayedContent(plainTextContent.current.substring(0, i));
          i++;
        } else {
          clearInterval(timer);
          setIsTyping(false);
          
          // When typing is complete, notify parent component to stop the loading indicator
          if (onTypingComplete) {
            console.log(`Typing complete for message ${message.id}, notifying parent`);
            onTypingComplete(message.id);
          }
        }
      }, typingSpeed.current);
      
      return () => clearInterval(timer);
    }
  }, [isTyping, isUser, message.id, onTypingComplete]);
  
  // Function to handle quick question click
  const handleQuickQuestionClick = (question: string) => {
    // Create a custom event to be caught by MessageInput
    const event = new CustomEvent('quickQuestionSelected', {
      detail: { question }
    });
    document.dispatchEvent(event);
  };

  return (
    <div className={cn("flex items-start gap-4", isUser ? "user-message" : "ai-message")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-primary/10 text-primary dark:bg-gray-600 dark:text-primary-foreground"
        )}
      >
        {isUser ? (
          <span className="text-sm font-semibold">{userAvatar}</span>
        ) : (
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
        )}
      </div>
      
      <div className="flex flex-col w-full max-w-[80%]">
        <div
          className={cn(
            "px-4 py-3 rounded-lg shadow-sm",
            isUser ? "user-message-bubble" : "ai-message-bubble"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{fullContent}</p>
          ) : (
            <div className="markdown-content">
              {isTyping ? (
                <p className="whitespace-pre-wrap ai-typing-text">
                  <span>{displayedContent}</span>
                  <span className="ai-typing-cursor"></span>
                </p>
              ) : (
                <ReactMarkdown>{fullContent}</ReactMarkdown>
              )}
            </div>
          )}
        </div>
        
        {/* Quick Questions section - only shown for AI messages and when typing is complete */}
        {!isUser && !isTyping && quickQuestions.length > 0 && (
          <div className="quick-questions mt-3 flex flex-col gap-2">
            <div className="text-xs text-muted-foreground mb-1">Quick Questions:</div>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className="quick-question-btn bg-primary/10 hover:bg-primary/20 text-primary text-sm px-3 py-1.5 rounded-full transition-colors"
                  onClick={() => handleQuickQuestionClick(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
