/**
 * Chat domain types.
 *
 * Kept deliberately small and domain-oriented. This is the single shared
 * definition of a chat message used by the chat feature components.
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

/**
 * Request payload for POST /api/chat: the conversation (including the newest
 * user message) that the Route Handler forwards to the AI provider so it can
 * answer follow-up questions with context.
 */
export interface ChatRequest {
  messages: readonly ChatMessage[];
}

/**
 * Maximum length of a single user message. Enforced in the browser (textarea
 * `maxLength` + counter) for UX and on the server in the /api/chat Route
 * Handler as the authoritative validation boundary.
 */
export const MAX_MESSAGE_LENGTH = 2000;
