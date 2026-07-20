import { Platform } from "react-native";

let SecureStore: any;
let MMKV: any;
let AsyncStorage: any;

try {
  SecureStore = require("expo-secure-store");
} catch {}
try {
  MMKV = require("react-native-mmkv").MMKV;
} catch {}
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {}

// In-memory fallback for web when native storage isn't available
const memStore: Record<string, string> = {};

let storage: any;

function initStorage() {
  if (Platform.OS === "web") {
    return {
      getString: (key: string) => localStorage.getItem(key),
      set: (key: string, value: string) => localStorage.setItem(key, value),
      delete: (key: string) => localStorage.removeItem(key),
    };
  }
  try {
    if (MMKV) {
      return new MMKV({ id: "herman-ai-storage" });
    }
  } catch {}
  // Fallback
  return {
    getString: (key: string) => memStore[key] ?? null,
    set: (key: string, value: string) => { memStore[key] = value; },
    delete: (key: string) => { delete memStore[key]; },
  };
}

storage = initStorage();

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS !== "web" && SecureStore) {
      return await SecureStore.getItemAsync("herman_access_token");
    }
    return storage?.getString("herman_access_token") ?? null;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    if (Platform.OS !== "web" && SecureStore) {
      await SecureStore.setItemAsync("herman_access_token", token);
    }
    storage?.set("herman_access_token", token);
  } catch {}
}

export async function removeToken(): Promise<void> {
  try {
    if (Platform.OS !== "web" && SecureStore) {
      await SecureStore.deleteItemAsync("herman_access_token");
    }
    storage?.delete("herman_access_token");
  } catch {}
}

export function getLocal(key: string): string | null {
  try {
    return storage?.getString(key) ?? null;
  } catch { return null; }
}

export function setLocal(key: string, value: string): void {
  try {
    storage?.set(key, value);
  } catch {}
}

export function deleteLocal(key: string): void {
  try {
    storage?.delete(key);
  } catch {}
}
