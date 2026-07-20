import { create } from "zustand";
import { api } from "../services/api";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspace_type: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  tools_enabled: string[];
  settings?: Record<string, any>;
  created_at: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  showCreateModal: boolean;

  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (data: { name: string; description?: string; workspace_type?: string; icon?: string; color?: string; tools_enabled?: string[]; settings?: Record<string, any> }) => Promise<void>;
  updateWorkspace: (id: string, data: { name?: string; description?: string; icon?: string; color?: string; tools_enabled?: string[]; settings?: Record<string, any> }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setCurrentWorkspace: (ws: Workspace | null) => void;
  setShowCreateModal: (v: boolean) => void;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,
  showCreateModal: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.getWorkspaces();
      set({ workspaces: data.workspaces || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Gagal memuat workspace", isLoading: false });
    }
  },

  createWorkspace: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await api.createWorkspace(payload);
      await get().fetchWorkspaces();
      set({ showCreateModal: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Gagal membuat workspace", isLoading: false });
    }
  },

  updateWorkspace: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await api.updateWorkspace(id, payload);
      await get().fetchWorkspaces();
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Gagal update workspace", isLoading: false });
    }
  },

  deleteWorkspace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteWorkspace(id);
      await get().fetchWorkspaces();
      if (get().currentWorkspace?.id === id) {
        set({ currentWorkspace: null });
      }
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Gagal menghapus workspace", isLoading: false });
    }
  },

  setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
  setShowCreateModal: (v) => set({ showCreateModal: v }),
  clearError: () => set({ error: null }),
}));
