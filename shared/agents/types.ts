// Shared types for agents
export interface Agent {
  id?: string; // Optional unique identifier for testing and referencing
  name: string;
  description: string;
  prompt: string;
}
