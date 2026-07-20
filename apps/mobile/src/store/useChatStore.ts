import { create } from "zustand";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  isLoading?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  message_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentWorkspaceId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;

  setConversations: (convs: Conversation[]) => void;
  setCurrentConversation: (id: string | null) => void;
  setCurrentWorkspaceId: (id: string | null) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (val: boolean) => void;
  setStreamingContent: (val: string) => void;
  appendStreamingContent: (val: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  currentWorkspaceId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",

  setConversations: (conversations) => set({ conversations }),

  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),

  setMessages: (messages) => set({ messages }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      }
      return { messages: msgs };
    }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  clearChat: () =>
    set((state) => ({
      messages: [],
      currentConversationId: null,
      streamingContent: "",
      isStreaming: false,
    })),
}));
