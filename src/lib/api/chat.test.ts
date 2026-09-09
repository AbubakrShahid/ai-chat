import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatRequestError, sendChatMessage } from "@/lib/api/chat";
import type { ChatMessage } from "@/features/chat/types";

const messages: ChatMessage[] = [
  { id: "1", role: "user", content: "Hello" },
  { id: "2", role: "assistant", content: "Hi there" },
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("sendChatMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the conversation and returns the assistant message on success", async () => {
    const reply: ChatMessage = { id: "9", role: "assistant", content: "An answer." };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: reply }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendChatMessage(messages);

    expect(result).toEqual(reply);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse((init?.body as string) ?? "")).toEqual({ messages });
  });

  it("turns a structured API error into a ChatRequestError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { code: "MESSAGE_TOO_LONG", message: "Too long." } }, 400)
        )
    );

    await expect(sendChatMessage(messages)).rejects.toMatchObject({
      name: "ChatRequestError",
      code: "MESSAGE_TOO_LONG",
      status: 400,
    });
  });

  it("handles an HTTP/provider failure, defaulting to REQUEST_FAILED", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 502)));

    await expect(sendChatMessage(messages)).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      status: 502,
    });
  });

  it("uses the provider error code when the failure body carries one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "PROVIDER_ERROR" } }, 502))
    );

    await expect(sendChatMessage(messages)).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 502,
    });
  });

  it("classifies an abort timeout as TIMEOUT", async () => {
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    await expect(sendChatMessage(messages)).rejects.toMatchObject({
      name: "ChatRequestError",
      code: "TIMEOUT",
      status: 0,
    });
  });

  it("classifies a network failure as NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(sendChatMessage(messages)).rejects.toMatchObject({
      name: "ChatRequestError",
      code: "NETWORK_ERROR",
      status: 0,
    });
  });

  it("rejects a malformed response safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: { content: 123 } })));

    await expect(sendChatMessage(messages)).rejects.toMatchObject({
      name: "ChatRequestError",
      code: "MALFORMED_RESPONSE",
    });
  });

  it("rejects when the response body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));

    await expect(sendChatMessage(messages)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });

  it("is an instance of ChatRequestError for error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "PROVIDER_ERROR" } }, 502))
    );

    try {
      await sendChatMessage(messages);
      expect.unreachable("expected the request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatRequestError);
    }
  });
});
