import * as SecureStore from "expo-secure-store";

const GEMINI_KEY = "gemini_api_key";

export async function getGeminiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(GEMINI_KEY);
}

export async function setGeminiKey(key: string): Promise<void> {
  if (key.trim()) {
    await SecureStore.setItemAsync(GEMINI_KEY, key.trim());
  } else {
    await SecureStore.deleteItemAsync(GEMINI_KEY);
  }
}
