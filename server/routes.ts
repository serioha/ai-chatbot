import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  generateChatCompletion, 
  generateConversationTitle, 
  type AIMessage, 
  getAvailableModels
} from "./ai-service";
import session from "express-session";
import { loginUserSchema, insertUserSchema, insertConversationSchema, updateConversationSchema, insertMessageSchema, updateUserSettingsSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import pgSession from "connect-pg-simple";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

const PgStore = pgSession(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "chatgpt-clone-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Authentication middleware
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Error handling middleware for Zod validation errors
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: fromZodError(err).details 
      });
    }
    
    return res.status(500).json({ 
      message: err instanceof Error ? err.message : "Internal server error" 
    });
  };

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        name: user.name
      });
    } catch (err: unknown) {
      handleZodError(err, res);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginUserSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(loginData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const isValid = await storage.verifyPassword(loginData.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      res.json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        name: user.name
      });
    } catch (err: unknown) {
      handleZodError(err, res);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: unknown) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        name: user.name
      });
    } catch (err: unknown) {
      res.status(500).json({ 
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  // Conversation routes
  app.get("/api/conversations", authenticate, async (req, res) => {
    try {
      const conversations = await storage.getConversationsByUserId(req.session.userId!);
      res.json(conversations);
    } catch (err: unknown) {
      res.status(500).json({ 
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  app.post("/api/conversations", authenticate, async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (err: unknown) {
      handleZodError(err, res);
    }
  });

  app.get("/api/conversations/:id", authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Ensure user owns this conversation
      if (conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      
      res.json({
        ...conversation,
        messages
      });
    } catch (err: unknown) {
      res.status(500).json({ 
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  app.patch("/api/conversations/:id", authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Ensure user owns this conversation
      if (conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateData = updateConversationSchema.parse(req.body);
      const updatedConversation = await storage.updateConversation(conversationId, updateData);
      
      res.json(updatedConversation);
    } catch (err: unknown) {
      handleZodError(err, res);
    }
  });

  app.delete("/api/conversations/:id", authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Ensure user owns this conversation
      if (conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const deleted = await storage.deleteConversation(conversationId);
      
      if (deleted) {
        return res.json({ message: "Conversation deleted successfully" });
      }
      
      res.status(500).json({ message: "Failed to delete conversation" });
    } catch (err: unknown) {
      res.status(500).json({ 
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  // Message routes
  app.post("/api/conversations/:id/messages", authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Ensure user owns this conversation
      if (conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get user settings to determine AI model
      const userSettings = await storage.getUserSettings(req.session.userId!);
      const aiModel = userSettings?.aiModel || "gpt-3.5-turbo";
      
      // Parse and create user message
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        role: "user"
      });
      
      // Save user message
      const userMessage = await storage.createMessage(messageData);
      
      // For first message, generate title
      if (conversation.title === "New Conversation") {
        const newTitle = await generateConversationTitle(messageData.content);
        await storage.updateConversation(conversationId, { title: newTitle });
      }
      
      // Get all messages in conversation to provide context
      const allMessages = await storage.getMessagesByConversationId(conversationId);
      
      // Format messages in the common AIMessage format
      const formattedMessages = allMessages.map(msg => {
        // Convert role to one of the supported roles
        const role = (
          msg.role === 'user' ? 'user' as const :
          msg.role === 'assistant' ? 'assistant' as const :
          msg.role === 'system' ? 'system' as const :
          'user' as const // Default to user if unknown
        );
        
        return {
          role,
          content: msg.content
        };
      });
      
      // Generate AI response with the common message format
      const aiResponseContent = await generateChatCompletion(formattedMessages, aiModel);
      
      // Save AI response
      const aiMessage = await storage.createMessage({
        content: aiResponseContent,
        role: "assistant",
        conversationId
      });
      
      // Return both messages
      res.status(201).json({
        userMessage,
        aiMessage
      });
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof ZodError) {
        return handleZodError(err, res);
      }
      res.status(500).json({ 
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  // User settings routes
  app.get("/api/settings", authenticate, async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.session.userId!);
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      res.json(settings);
    } catch (err: unknown) {
      res.status(500).json({ 
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  app.patch("/api/settings", authenticate, async (req, res) => {
    try {
      const updateData = updateUserSettingsSchema.parse(req.body);
      const settings = await storage.updateUserSettings(req.session.userId!, updateData);
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      res.json(settings);
    } catch (err: unknown) {
      handleZodError(err, res);
    }
  });
  
  // Get available AI models
  app.get("/api/models", authenticate, (req, res) => {
    try {
      const models = getAvailableModels();
      res.json(models);
    } catch (error) {
      console.error("Error getting available models:", error);
      res.status(500).json({ message: "Failed to get available models" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
