import type { Agent } from '../../../shared/agents/types';

// Sample Agent module
// Each agent should be a separate file in this folder
export const SampleAgent: Agent = {
  name: 'Sample Agent',
  description: 'Performs sample agent tasks',
  prompt: 'You are an expert agent. Please analyze the user input and provide a detailed response.'
};
