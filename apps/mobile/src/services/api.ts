import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getToken, removeToken } from "../utils/storage";

import { Platform } from "react-native";

const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.68.91.137:9876/api/v1";
    }
    return "http://localhost:9876/api/v1";
  }
  return "https://api.herman-ai.com/api/v1";
};

const BASE_URL = getBaseUrl();

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 180000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await removeToken();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(email: string, username: string, password: string) {
    return this.client.post("/auth/register", { email, username, password });
  }

  async login(email: string, password: string) {
    return this.client.post("/auth/login", { email, password });
  }

  async getMe() {
    return this.client.get("/auth/me");
  }

  // Chat
  async sendMessage(params: {
    conversation_id?: string;
    content: string;
    provider?: string;
    model?: string;
    workspace_id?: string;
    stream?: boolean;
  }) {
    return this.client.post("/chat/send", params);
  }

  async sendMessageStream(
    params: {
      conversation_id?: string;
      content: string;
      provider?: string;
      model?: string;
      workspace_id?: string;
    },
    onChunk: (text: string) => void,
    onTool: (tool: string) => void,
    onDone: (convId: string, fullContent: string) => void,
    onError: (err: string) => void,
  ) {
    const token = await getToken();
    const url = `${BASE_URL}/chat/send/stream`;
    const body = JSON.stringify(params);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 180000;

    let lastIndex = 0;
    let buffer = "";

    xhr.onprogress = () => {
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += newText;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk") onChunk(data.content);
            else if (data.type === "tool") onTool(data.tool);
            else if (data.type === "error") onError(data.content);
            else if (data.type === "full") onDone(data.conversation_id, data.content);
          } catch {}
        }
      }
    };

    xhr.onerror = () => onError(xhr.statusText || "Connection failed");
    xhr.ontimeout = () => onError("Request timeout");

    xhr.onloadend = () => {
      if (xhr.status >= 400) {
        onError(`Server error (${xhr.status})`);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const finalText = xhr.responseText;
        const allLines = finalText.split("\n");
        for (const line of allLines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "full") {
                onDone(data.conversation_id, data.content);
                return;
              }
            } catch {}
          }
        }
        onDone("", "");
      }
    };

    xhr.send(body);
  }

  async getConversations(workspace_id?: string) {
    const params = workspace_id ? { workspace_id } : {};
    return this.client.get("/chat/conversations", { params });
  }

  async getConversation(id: string) {
    return this.client.get(`/chat/conversations/${id}`);
  }

  async deleteConversation(id: string) {
    return this.client.delete(`/chat/conversations/${id}`);
  }

  // Workspaces
  async getWorkspaces() {
    return this.client.get("/workspaces");
  }

  async getWorkspace(id: string) {
    return this.client.get(`/workspaces/${id}`);
  }

  async createWorkspace(data: { name: string; workspace_type?: string; description?: string; icon?: string; color?: string; tools_enabled?: string[]; settings?: Record<string, any> }) {
    return this.client.post("/workspaces", data);
  }

  async updateWorkspace(id: string, data: { name?: string; description?: string; icon?: string; color?: string; tools_enabled?: string[] }) {
    return this.client.put(`/workspaces/${id}`, data);
  }

  async deleteWorkspace(id: string) {
    return this.client.delete(`/workspaces/${id}`);
  }

  // Memory
  async getMemories() {
    return this.client.get("/memory");
  }

  async saveMemory(key: string, value: string, category?: string) {
    return this.client.post("/memory", { key, value, category });
  }
}

export const api = new ApiService();
