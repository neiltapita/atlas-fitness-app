import * as SecureStore from "expo-secure-store";

const CLAUDE_KEY = "claude_api_key";

export async function getClaudeKey(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAUDE_KEY);
}

export async function setClaudeKey(key: string): Promise<void> {
  if (key.trim()) {
    await SecureStore.setItemAsync(CLAUDE_KEY, key.trim());
  } else {
    await SecureStore.deleteItemAsync(CLAUDE_KEY);
  }
}
