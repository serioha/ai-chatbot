### Codebase structure and its main components

Here’s an overview of your codebase structure and its main components:

- `client`
    
    The frontend React app, using TypeScript and Vite.
    
    - `src/` contains your main React components, pages, and UI utilities.
        - Components like UserSettingsDialog, ChatArea, and a customizable chart UI (chart.tsx) are present.
        - Uses libraries such as React Query, Wouter (routing), and Shadcn/ui for UI primitives.
        - Theming and authentication are handled via ThemeProvider and AuthProvider.
        - **AI Assistants:** All assistant UIs, prompt selectors, and related logic are centralized in `src/assistants/`.  
          Each assistant (one prompt per assistant) is a separate module for easy add/update/remove.

- `server`
    
    The backend, built with Express and TypeScript.
    
    - Handles API routes (routes.ts), database access (db.ts), and OpenAI integration (openai.ts).
    - Uses Drizzle ORM with Neon serverless Postgres.
    - Integrates with Vite for SSR or dev middleware (vite.ts).
    - **AI Agents:** All agent logic, prompt definitions, and agent-specific APIs are centralized in `src/agents/`.  
      Each agent (e.g., Personality Assessment Agent, Coaching Recommendation Agent) is a separate module for maximum flexibility.

- `shared`
    
    Shared TypeScript types and schema (schema.ts) for use across client and server.
    - **Assistant/Agent Types & Prompts:** Shared types and prompt templates are organized in `shared/assistants/` or `shared/agents/` for reuse and consistency.

- `attached_assets`
    
    Images and text assets.
    
- Project configuration:
    - vite.config.ts: Vite config with custom aliases for `@`, `@shared`, and `@assets`.
    - tsconfig.json: TypeScript config for strict type checking and path aliases.
    - components.json: Shadcn/ui config for UI component generation and theming.

### **Summary:**

This is a full-stack AI chatbot template using React (frontend), Express (backend), and a shared TypeScript schema.  
**AI assistants and agents are centralized in dedicated folders (`src/assistants/`, `src/agents/`) for maximum flexibility and maintainability.**  
The codebase is modular, uses modern tooling, and is ready for cloud/serverless deployment.