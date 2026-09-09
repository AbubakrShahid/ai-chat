import { MAX_MESSAGE_LENGTH, type ChatMessage, type ChatRole } from "@/features/chat/types";
import { env } from "@/lib/env";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ProviderResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

interface RequestBody {
  messages?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** AbortSignal.timeout() aborts with a "TimeoutError" DOMException. */
function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

function jsonError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

interface ValidatedMessage {
  role: ChatRole;
  content: string;
}

type MessagesValidation =
  { ok: true; messages: ValidatedMessage[] } | { ok: false; code: string; message: string };

/**
 * Validates the conversation array: must be a non-empty array of objects with
 * a supported role ("user" | "assistant") and non-empty string content. User
 * content keeps the existing MAX_MESSAGE_LENGTH cap; assistant content is
 * server-generated (our own replies matched verbatim back to the UI) so it is
 * not length-capped here.
 */
function validateMessages(value: unknown): MessagesValidation {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "The 'messages' field must be a non-empty array.",
    };
  }

  const messages: ValidatedMessage[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return {
        ok: false,
        code: "INVALID_REQUEST",
        message: "Every entry in 'messages' must be an object.",
      };
    }

    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return {
        ok: false,
        code: "INVALID_REQUEST",
        message: "Message role must be 'user' or 'assistant'.",
      };
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return {
        ok: false,
        code: "INVALID_REQUEST",
        message: "Every message must have non-empty string content.",
      };
    }
    if (role === "user" && content.trim().length > MAX_MESSAGE_LENGTH) {
      return {
        ok: false,
        code: "MESSAGE_TOO_LONG",
        message: `The message exceeds the maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
      };
    }

    messages.push({ role, content: content.trim() });
  }

  return { ok: true, messages };
}

/**
 * POST /api/chat
 *
 * Request body:  { "messages": [ { "role": "user" | "assistant", "content": "..." }, ... ] }
 * Success body:  { "message": { "id": "...", "role": "assistant", "content": "..." } }
 * Error body:    { "error": { "code": "...", "message": "..." } }
 *
 * The client owns conversation history; this endpoint is stateless and relays
 * the validated conversation (roles "user"/"assistant" only) to OpenRouter so
 * follow-up questions retain context.
 */
export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const validation = validateMessages(body.messages);
  if (!validation.ok) {
    return jsonError(validation.code, validation.message, 400);
  }

  const apiKey = env.openRouterApiKey;
  const model = env.openRouterModel;
  if (!apiKey || !model) {
    return jsonError(
      "CONFIGURATION_ERROR",
      "Chat is not configured. Set OPENROUTER_API_KEY and OPENROUTER_MODEL on the server.",
      500
    );
  }

  const payload = {
    model,
    messages: validation.messages,
  };

  let providerResponse: ProviderResponse;
  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`[chat] OpenRouter request failed with status ${response.status}`);
      return jsonError("PROVIDER_ERROR", "Unable to generate a response.", 502);
    }

    providerResponse = (await response.json()) as ProviderResponse;
  } catch (error) {
    if (isTimeoutError(error)) {
      console.error("[chat] OpenRouter request timed out");
      return jsonError(
        "TIMEOUT",
        "The AI service took too long to respond. Please try again.",
        504
      );
    }
    console.error(
      "[chat] OpenRouter request failed",
      error instanceof Error ? error.message : "unknown error"
    );
    return jsonError("PROVIDER_ERROR", "Unable to generate a response.", 502);
  }

  const content = providerResponse.choices?.[0]?.message?.content;
  if (!isNonEmptyString(content)) {
    console.error("[chat] OpenRouter response was malformed");
    return jsonError("PROVIDER_ERROR", "Unable to generate a response.", 502);
  }

  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
  };

  return Response.json({ message: assistantMessage });
}
