"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/features/chat/types";
import { ChatRequestError, sendChatMessage } from "@/lib/api/chat";
import { ChatWindow } from "@/features/chat/components/chat-window";
import { clearMessages, loadMessages, saveMessages } from "@/features/chat/storage";

/**
 * Failures the user can sensibly act on by resending the same message. Input
 * validation and configuration errors are excluded: retrying them would just
 * fail again.
 */
const NON_RETRYABLE_CODES = new Set(["INVALID_REQUEST", "MESSAGE_TOO_LONG", "CONFIGURATION_ERROR"]);

function isRetryable(error: unknown): boolean {
  return !(error instanceof ChatRequestError && NON_RETRYABLE_CODES.has(error.code));
}

/**
 * Maps any failed request to a safe, user-facing message. Raw provider errors,
 * API keys, and implementation details are never surfaced to the UI.
 */
function toUserErrorMessage(error: unknown): string {
  if (error instanceof ChatRequestError) {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Unable to reach the AI service. Please check your connection and try again.";
      case "TIMEOUT":
        return "The AI service took too long to respond. Please try again.";
      case "CONFIGURATION_ERROR":
        return "The AI service is not configured correctly.";
      case "MESSAGE_TOO_LONG":
        return "The message is too long. Please shorten it and try again.";
      case "INVALID_REQUEST":
        return "Something went wrong while sending your message. Please try again.";
      case "PROVIDER_ERROR":
      case "MALFORMED_RESPONSE":
      case "REQUEST_FAILED":
        return "The AI service is temporarily unavailable. Please try again.";
      default:
        return "Something went wrong while generating the response. Please try again.";
    }
  }
  return "Something went wrong while generating the response. Please try again.";
}

interface ChatContainerProps {
  /**
   * Initial conversation passed from the server. Used only to seed state on
   * first render; ownership of the conversation lives here afterwards.
   */
  initialMessages: readonly ChatMessage[];
}

/**
 * ChatContainer — owner of the chat's application state (Client Component).
 *
 * Responsibilities:
 * - owns the conversation (`messages`)
 * - owns the loading state (`isLoading`)
 * - owns the error state (`error`) and the failed-request snapshot
 *   (`lastFailedRequest`)
 * - coordinates sending and retrying
 *
 * It holds no markup beyond composition: presentation is delegated to
 * ChatWindow and its children. Every request posts the full conversation —
 * the messages already shown plus the new user message — to our own /api/chat
 * Route Handler (never to OpenRouter directly), so the model can answer
 * follow-up questions with context; the returned assistant message is appended
 * to the conversation.
 *
 * The request snapshot is built explicitly from the current render's
 * `messages` plus the new user message (never by reading state right after a
 * `setMessages()` call, since React state updates are async). On failure the
 * exact snapshot is stored so "Try again" resends the same conversation
 * context without adding another user bubble.
 *
 * A `finally` block guarantees loading always ends (success, error, timeout,
 * network failure, or unexpected exception), and a ref-based guard allows only
 * one in-flight request so rapid double-submits cannot send duplicates.
 *
 * Persistence: the conversation is saved to LocalStorage (key
 * `ai-chat-messages`) whenever it changes, and restored on mount. Only
 * messages are persisted — never loading/error/retry state. Restoration runs
 * in a client-side effect guarded by `hasRestored`; the persistence effect is
 * a no-op until that flag is set, so the initial seed messages can never
 * overwrite a saved conversation before it has been read. Malformed or missing
 * stored data falls back to the seed messages. "Clear Chat" resets the
 * conversation to the seeds, clears the stored conversation, and dismisses any
 * error/retry state — without reloading the page or calling the API.
 */
export function ChatContainer({ initialMessages }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [...initialMessages]);
  const [hasRestored, setHasRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<ChatMessage[] | null>(null);
  const requestInFlight = useRef(false);

  // Restore a saved conversation once, client-side, after the initial render.
  // Until restoration completes, `hasRestored` stays false and the persistence
  // effect below is a no-op, so the seed messages are never written over a
  // stored conversation. When nothing (or invalid data) is stored, the seeds
  // already rendered are kept as the fallback.
  //
  // React bootstrap from SSR means the server HTML (and thus the first client
  // paint) must render the seed messages; LocalStorage only exists in the
  // browser, so its value can only be applied in a mount effect. The two
  // synchronous setState calls here are a deliberate, one-time external-data
  // read, not the avoidable cascading-render pattern this rule targets.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time post-hydration LocalStorage restore; see comment above */
  useEffect(() => {
    const saved = loadMessages();
    if (saved) {
      setMessages(saved);
    }
    setHasRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist the conversation after restoration. Saving the seeds (e.g. when
  // nothing was stored or after Clear Chat) is intentional — they are the
  // current conversation.
  useEffect(() => {
    if (!hasRestored) return;
    saveMessages(messages);
  }, [messages, hasRestored]);

  const handleClear = () => {
    if (isLoading) return;
    if (!window.confirm("Clear the current conversation?")) return;
    clearMessages();
    setMessages([...initialMessages]);
    setError(null);
    setLastFailedRequest(null);
  };

  /**
   * Sends a stable conversation snapshot to the API. `userMessage` is non-null
   * on a fresh send (and is also the appended UI bubble); it is `null` on
   * retry, which resends the exact failed snapshot and skips adding another
   * user message.
   */
  const performRequest = async (
    requestMessages: ChatMessage[],
    userMessage: ChatMessage | null
  ) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError(null);
    setLastFailedRequest(null);
    setIsLoading(true);

    if (userMessage) {
      setMessages((current) => [...current, userMessage]);
    }

    try {
      const assistantMessage = await sendChatMessage(requestMessages);
      setMessages((current) => [...current, assistantMessage]);
    } catch (caught) {
      console.error("Failed to get a response:", caught);
      setError(toUserErrorMessage(caught));
      if (isRetryable(caught)) {
        setLastFailedRequest([...requestMessages]);
      }
    } finally {
      setIsLoading(false);
      requestInFlight.current = false;
    }
  };

  const handleSend = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    // Stable snapshot for this request: the conversation as rendered right now
    // plus the new user message. Not derived from state after setMessages().
    void performRequest([...messages, userMessage], userMessage);
  };

  const handleRetry = () => {
    if (lastFailedRequest) {
      void performRequest(lastFailedRequest, null);
    }
  };

  return (
    <ChatWindow
      messages={messages}
      isLoading={isLoading}
      error={error}
      canRetry={lastFailedRequest !== null}
      onSend={handleSend}
      onRetry={handleRetry}
      onClear={handleClear}
    />
  );
}
