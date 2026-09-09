import type { ChatMessage } from "@/features/chat/types";

/**
 * Browser-side persistence for the chat conversation (LocalStorage).
 *
 * This module is browser-only: every function guards on `typeof window` and is
 * called only from client code (effects and event handlers), never during
 * server rendering. Only the conversation messages are stored — never API keys,
 * loading/error/retry state, or anything unrelated.
 *
 * Persistence is best-effort. If LocalStorage is unavailable, writes fail, or
 * stored data is malformed, the functions degrade gracefully so the app still
 * works as an in-memory chat.
 */

export const CHAT_STORAGE_KEY = "ai-chat-messages";

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.content === "string" &&
    (record.role === "user" || record.role === "assistant")
  );
}

/**
 * Reads the stored conversation. Returns the messages only if the stored value
 * is a non-empty array of valid ChatMessage objects; returns null (caller then
 * falls back to the initial seed messages) for a missing key, invalid JSON,
 * wrong shape, or malformed entries. Never throws.
 */
export function loadMessages(): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every(isChatMessage)) return null;
    return parsed as ChatMessage[];
  } catch {
    return null;
  }
}

/** Saves the current conversation. Failures are logged as a concise warning. */
export function saveMessages(messages: readonly ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn("[chat] Could not persist the conversation to LocalStorage.", error);
  }
}

/** Removes the stored conversation. Failures are logged as a concise warning. */
export function clearMessages(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.warn("[chat] Could not clear the LocalStorage conversation.", error);
  }
}
