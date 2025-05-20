import { 
  users, 
  conversations, 
  messages, 
  userSettings,
  type User, 
  type InsertUser, 
  type Conversation, 
  type InsertConversation, 
  type UpdateConversation, 
  type Message, 
  type InsertMessage,
  type UserSettings,
  type InsertUserSettings,
  type UpdateUserSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import * as bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, data: UpdateConversation): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Settings methods
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: UpdateUserSettings): Promise<UserSettings | undefined>;
  
  // Authentication
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword
      })
      .returning();
    
    // Create default settings for the user
    await this.createUserSettings({
      userId: user.id,
      theme: 'system',
      aiModel: 'gpt-3.5-turbo'
    });
    
    return user;
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    return conversation;
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    
    return newConversation;
  }
  
  async updateConversation(id: number, data: UpdateConversation): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  async deleteConversation(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning({ id: conversations.id });
    
    return !!deleted;
  }
  
  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    
    return message;
  }
  
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    
    // Update the conversation's updatedAt field
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return newMessage;
  }
  
  // Settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    
    return settings;
  }
  
  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [newSettings] = await db
      .insert(userSettings)
      .values(settings)
      .returning();
    
    return newSettings;
  }
  
  async updateUserSettings(userId: number, settings: UpdateUserSettings): Promise<UserSettings | undefined> {
    const [updatedSettings] = await db
      .update(userSettings)
      .set(settings)
      .where(eq(userSettings.userId, userId))
      .returning();
    
    return updatedSettings;
  }
  
  // Authentication
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export const storage = new DatabaseStorage();
