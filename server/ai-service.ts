import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";

// Initialize clients with API keys
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-" 
});

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const mistralAI = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || ""
});

// Common message interface for all providers
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Generate a chat completion using the specified model and provider
 */
export async function generateChatCompletion(
  messages: AIMessage[],
  model: string = "gpt-4o"
): Promise<string> {
  // Extract provider if model includes it
  let provider = 'openai';
  let modelName = model;
  
  if (model.includes(':')) {
    const parts = model.split(':');
    provider = parts[0];
    modelName = parts[1];
  }
  
  try {
    switch(provider) {
      case 'openai':
        return await generateOpenAIChatCompletion(messages, modelName);
      case 'google':
        return await generateGoogleChatCompletion(messages, modelName);
      case 'mistral':
        return await generateMistralChatCompletion(messages, modelName);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error: any) {
    console.error(`Error generating chat completion: ${error.message}`, error);
    
    // Try fallback if available
    // First try Mistral as fallback if available
    if (process.env.MISTRAL_API_KEY && provider !== 'mistral') {
      console.log("Falling back to Mistral model");
      try {
        return await generateMistralChatCompletion(messages, "mistral-large-2");
      } catch (fallbackError: any) {
        console.error(`Mistral fallback error: ${fallbackError.message}`);
      }
    }
    
    // Then try OpenAI as fallback if available
    if (process.env.OPENAI_API_KEY && provider !== 'openai') {
      console.log("Falling back to OpenAI model");
      try {
        return await generateOpenAIChatCompletion(messages, "gpt-3.5-turbo");
      } catch (fallbackError: any) {
        console.error(`OpenAI fallback error: ${fallbackError.message}`);
      }
    }
    
    // Finally try Google as fallback if available
    if (process.env.GOOGLE_API_KEY && provider !== 'google') {
      console.log("Falling back to Google Gemini model");
      try {
        return await generateGoogleChatCompletion(messages, "gemini-2.0-flash");
      } catch (fallbackError: any) {
        console.error(`Google fallback error: ${fallbackError.message}`);
      }
    }
    
    const errorMessage = error.message || 'Unknown error';
    throw new Error(`Failed to generate AI response: ${errorMessage}`);
  }
}

/**
 * Generate a conversation title using the specified model
 */
export async function generateConversationTitle(
  firstUserMessage: string,
  model: string = "gpt-3.5-turbo"
): Promise<string> {
  try {
    // For title generation, we'll default to using the model without provider prefix for simplicity
    let provider = 'openai';
    let modelName = model;
    
    if (model.includes(':')) {
      const parts = model.split(':');
      provider = parts[0];
      modelName = parts[1];
    }
    
    if (provider === 'openai') {
      const systemPrompt = "Generate a short, descriptive title (max 6 words) for a conversation that starts with the following message. Respond with ONLY the title, no quotes or additional text.";
      
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: firstUserMessage }
      ];
      
      return await generateOpenAIChatCompletion(messages, modelName);
    } else if (provider === 'google') {
      // For Google models, adapt the prompt because system messages aren't supported
      const titlePrompt = "Generate a short, descriptive title (max 6 words) for a conversation that starts with the following message. Respond with ONLY the title, no quotes or additional text.\n\n" + firstUserMessage;
      
      const messages: AIMessage[] = [
        { role: 'user', content: titlePrompt }
      ];
      
      return await generateGoogleChatCompletion(messages, modelName);
    }
    
    // Default fallback to OpenAI
    const messages: AIMessage[] = [
      { role: 'system', content: "Generate a short, descriptive title (max 6 words) for a conversation that starts with the following message. Respond with ONLY the title, no quotes or additional text." },
      { role: 'user', content: firstUserMessage }
    ];
    
    return await generateOpenAIChatCompletion(messages, "gpt-3.5-turbo");
  } catch (error: any) {
    // Try fallback for title generation
    try {
      if (process.env.GOOGLE_API_KEY) {
        // For Google fallback, adapt the prompt because system messages aren't supported
        const titlePrompt = "Generate a short, descriptive title (max 6 words) for a conversation that starts with the following message. Respond with ONLY the title, no quotes or additional text.\n\n" + firstUserMessage;
        
        const messages: AIMessage[] = [
          { role: 'user', content: titlePrompt }
        ];
        
        return await generateGoogleChatCompletion(messages, "gemini-2.0-flash");
      }
    } catch (fallbackError: any) {
      console.error(`Google fallback error: ${fallbackError.message}`);
    }
    
    // Fallback to a simple title if all attempts fail
    console.error(`Error generating title: ${error.message}`);
    return "New Conversation";
  }
}

/**
 * OpenAI-specific implementation
 */
async function generateOpenAIChatCompletion(
  messages: AIMessage[],
  model: string
): Promise<string> {
  // Add system instruction for generating quick questions if not present
  let hasSystemMessage = messages.some(msg => msg.role === 'system');
  
  const systemInstruction = {
    role: 'system' as const,
    content: `You are a helpful AI assistant. After providing your answer, suggest 4 follow-up questions that might be relevant to continue the conversation. 
    
Format your response like this:
1. Answer the user's question normally and completely.
2. At the end of your response, add:
<QUICK_QUESTIONS>
Question 1
Question 2
Question 3
Question 4
</QUICK_QUESTIONS>

Keep the questions concise, focused, and diverse to explore different aspects of the topic. Make sure questions are relevant to the context of the conversation.`
  };
  
  // Format messages for OpenAI, adding the system instruction if needed
  const openaiMessages = !hasSystemMessage 
    ? [systemInstruction, ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))]
    : messages.map(msg => {
        // If it's an existing system message, append our quick questions instruction
        if (msg.role === 'system') {
          return {
            role: msg.role,
            content: msg.content + '\n\n' + systemInstruction.content
          };
        }
        return {
          role: msg.role,
          content: msg.content
        };
      });
  
  const response = await openai.chat.completions.create({
    model,
    messages: openaiMessages,
    temperature: 0.7,
    max_tokens: 1000, // Increased to allow for the additional questions
  });
  
  return response.choices[0].message.content || '';
}

/**
 * Mistral-specific implementation
 */
async function generateMistralChatCompletion(
  messages: AIMessage[],
  model: string
): Promise<string> {
  try {
    // Add system instruction for generating quick questions if not present
    let hasSystemMessage = messages.some(msg => msg.role === 'system');
    
    const systemInstruction = {
      role: 'system' as const,
      content: `You are a helpful AI assistant. After providing your answer, suggest 4 follow-up questions that might be relevant to continue the conversation. 
      
Format your response like this:
1. Answer the user's question normally and completely.
2. At the end of your response, add:
<QUICK_QUESTIONS>
Question 1
Question 2
Question 3
Question 4
</QUICK_QUESTIONS>

Keep the questions concise, focused, and diverse to explore different aspects of the topic. Make sure questions are relevant to the context of the conversation.`
    };
    
    // Format messages for Mistral, adding the system instruction if needed
    const formattedMessages = !hasSystemMessage 
      ? [systemInstruction, ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))]
      : messages.map(msg => {
          // If it's an existing system message, append our quick questions instruction
          if (msg.role === 'system') {
            return {
              role: msg.role,
              content: msg.content + '\n\n' + systemInstruction.content
            };
          }
          return {
            role: msg.role,
            content: msg.content
          };
        });
    
    // Generate chat completion using the complete method
    const response = await mistralAI.chat.complete({
      model: model,
      messages: formattedMessages,
      temperature: 0.7,
      maxTokens: 1000, // Increased to allow for the additional questions
    });
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Empty response from Mistral API');
    }
    
    const content = response.choices[0].message.content;
    
    // Handle different content types (string or array)
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      // Join content chunks if it's an array
      return content.map(chunk => 
        typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
      ).join('');
    }
    
    return '';
  } catch (error) {
    console.error('Error in Mistral API:', error);
    throw error;
  }
}

/**
 * Google Gemini-specific implementation
 */
async function generateGoogleChatCompletion(
  messages: AIMessage[],
  model: string
): Promise<string> {
  // Initialize the model with the updated model name
  const geminiModel = googleAI.getGenerativeModel({ model });
  
  // Add Quick Questions instruction to system prompts
  const quickQuestionsInstructions = `
You are a helpful AI assistant. After providing your answer, suggest 4 follow-up questions that might be relevant to continue the conversation.

Format your response like this:
1. Answer the user's question normally and completely.
2. At the end of your response, add:
<QUICK_QUESTIONS>
Question 1
Question 2
Question 3
Question 4
</QUICK_QUESTIONS>

Keep the questions concise, focused, and diverse to explore different aspects of the topic. Make sure questions are relevant to the context of the conversation.
`;
  
  // Filter out system messages as Gemini doesn't support them
  // and convert remaining messages to Gemini format
  const formattedMessages = [];
  
  // If there's a system message, prepend it to the first user message instead
  let systemPrompt = quickQuestionsInstructions + "\n\n";
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt += msg.content + "\n\n";
      continue; // Skip adding system message directly
    }
    
    const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
    
    // If this is the first user message and we have a system prompt, prepend it
    let messageContent = msg.content;
    if (geminiRole === 'user' && systemPrompt && formattedMessages.length === 0) {
      messageContent = `${systemPrompt}${messageContent}`;
      systemPrompt = ""; // Clear it so we don't use it again
    }
    
    const userPart = {
      role: geminiRole,
      parts: [{ text: messageContent }]
    };
    formattedMessages.push(userPart);
  }
  
  // If we have only system messages and no user/assistant messages, create a user message
  if (formattedMessages.length === 0 && systemPrompt) {
    formattedMessages.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
  }
  
  // Generate content directly
  try {
    const result = await geminiModel.generateContent({
      contents: formattedMessages,
      generationConfig: {
        maxOutputTokens: 1000, // Increased to allow for the additional questions
        temperature: 0.7,
      }
    });
    
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error in Gemini API:', error);
    throw error;
  }
}

/**
 * Get all available models for the UI
 */
export function getAvailableModels() {
  const models = [];
  
  if (process.env.OPENAI_API_KEY) {
    models.push(
      { id: 'openai:gpt-4o', name: 'GPT-4o (OpenAI)', provider: 'openai' },
      { id: 'openai:gpt-3.5-turbo', name: 'GPT-3.5 (OpenAI)', provider: 'openai' }
    );
  }
  
  if (process.env.GOOGLE_API_KEY) {
    models.push(
      { id: 'google:gemini-2.0-flash', name: 'Gemini 2.0 Flash (Google)', provider: 'google' }
    );
  }
  
  if (process.env.MISTRAL_API_KEY) {
    models.push(
      { id: 'mistral:mistral-large-2', name: 'Mistral Large 2', provider: 'mistral' },
      { id: 'mistral:mistral-medium', name: 'Mistral Medium', provider: 'mistral' }
    );
  }
  
  // If no models are available (no API keys), add placeholders
  if (models.length === 0) {
    models.push(
      { id: 'openai:gpt-3.5-turbo', name: 'GPT-3.5 (requires API key)', provider: 'openai' }
    );
  }
  
  return models;
}