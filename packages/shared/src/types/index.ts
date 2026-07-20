export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin" | "superadmin";
  subscription_tier: "free" | "pro" | "enterprise";
  preferences: Record<string, any>;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  workspace_id: string | null;
  is_pinned: boolean;
  message_count: number;
  token_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  tool_name?: string;
  token_count?: number;
  created_at: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema?: Record<string, any>;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspace_type: WorkspaceType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  tools_enabled: string[];
}

export type WorkspaceType =
  | "developer"
  | "marketing"
  | "business"
  | "creative"
  | "learning"
  | "personal";

export interface AIMemory {
  id: string;
  key: string;
  value: string;
  category: "general" | "preference" | "fact" | "context";
  importance: number;
  created_at: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_type: "image" | "document" | "code" | "audio" | "video" | "other";
  thumbnail_path: string | null;
  created_at: string;
}

export interface AIProvider {
  name: string;
  display_name: string;
  models: string[];
  is_configured: boolean;
}

export const AI_PROVIDERS: AIProvider[] = [
  { name: "deepseek", display_name: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"], is_configured: true },
  { name: "openai", display_name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini"], is_configured: false },
  { name: "anthropic", display_name: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-haiku-3-20240307"], is_configured: false },
  { name: "gemini", display_name: "Google Gemini", models: ["gemini-2.0-flash", "gemini-2.0-pro"], is_configured: false },
  { name: "ollama", display_name: "Ollama (Local)", models: ["llama3", "mistral", "codellama"], is_configured: false },
];
