export const APP_NAME = "Herman AI";
export const APP_VERSION = "1.0.0";
export const APP_TAGLINE = "Your AI Operating System";

export const API_TIMEOUT = 30000;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CONVERSATION_HISTORY = 50;
export const MAX_TOOL_ITERATIONS = 10;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "herman_access_token",
  REFRESH_TOKEN: "herman_refresh_token",
  THEME: "herman_theme",
  GUEST_CONVERSATIONS: "herman_guest_conversations",
  SETTINGS: "herman_settings",
} as const;

export const WORKSPACE_TYPES = [
  { id: "developer", label: "Developer", icon: "code-slash" },
  { id: "marketing", label: "Marketing", icon: "megaphone" },
  { id: "business", label: "Business", icon: "briefcase" },
  { id: "creative", label: "Creative", icon: "color-palette" },
  { id: "learning", label: "Learning", icon: "school" },
  { id: "personal", label: "Personal", icon: "person" },
] as const;

export const DEFAULT_SYSTEM_PROMPT = `You are Herman AI, an advanced AI Operating System. You are:
- A highly knowledgeable assistant capable of answering questions on any topic
- An AI agent that can execute tools and perform actions autonomously
- A companion that understands emotions and responds with empathy
- A professional expert that automatically adapts to the user's context`;
