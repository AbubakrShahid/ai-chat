import type { ChatMessage, ChatRequest } from "@/features/chat/types";

interface SendChatMessageResponse {
  message: ChatMessage;
}

interface ChatErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ChatRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ChatRequestError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Browser-side safety net: the Route Handler already enforces a server timeout
 * and returns a structured `TIMEOUT` error; this aborts slightly later so the
 * UI can never hang indefinitely if the server itself stalls.
 */
const REQUEST_TIMEOUT_MS = 35_000;

/**
 * Sends the conversation history (including the newest user message) to our
 * own /api/chat Route Handler and returns the assistant's reply. The OpenRouter
 * key never leaves the server — this helper runs in the browser and only talks
 * to the same-origin API route.
 */
export async function sendChatMessage(messages: readonly ChatMessage[]): Promise<ChatMessage> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages } satisfies ChatRequest),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ChatRequestError(
        "TIMEOUT",
        "The AI service took too long to respond. Please try again.",
        0
      );
    }
    throw new ChatRequestError("NETWORK_ERROR", "Could not reach the server. Please try again.", 0);
  }

  const body = (await response.json().catch(() => null)) as
    ChatErrorBody | SendChatMessageResponse | null;

  if (!response.ok) {
    const error = (body as ChatErrorBody | null)?.error;
    throw new ChatRequestError(
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request failed. Please try again.",
      response.status
    );
  }

  const assistantMessage = (body as SendChatMessageResponse | null)?.message;
  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new ChatRequestError(
      "MALFORMED_RESPONSE",
      "The server returned an unexpected response.",
      response.status
    );
  }

  return assistantMessage;
}
