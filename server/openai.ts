import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-" 
});

export async function generateChatCompletion(
  messages: ChatCompletionMessageParam[],
  model: string = "gpt-4o"
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error: unknown) {
    console.error("Error generating chat completion:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to generate AI response: ${errorMessage}`);
  }
}

export async function generateConversationTitle(
  firstUserMessage: string,
  model: string = "gpt-3.5-turbo"
): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "Generate a short, descriptive title (max 6 words) for a conversation that starts with the following message. Respond with ONLY the title, no quotes or additional text.",
      },
      {
        role: "user",
        content: firstUserMessage,
      },
    ];
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 30,
    });

    // Remove any quotes and trim the title
    let title = response.choices[0].message.content || "New Conversation";
    title = title.replace(/["']/g, "").trim();
    
    return title;
  } catch (error: unknown) {
    console.error("Error generating conversation title:", error);
    return "New Conversation";
  }
}
