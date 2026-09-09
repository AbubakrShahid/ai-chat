import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { MAX_MESSAGE_LENGTH } from "@/features/chat/types";

const request = (body: string) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

describe("POST /api/chat validation", () => {
  it("rejects a body that is not valid JSON with 400", async () => {
    const response = await POST(request("{not json"));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("INVALID_REQUEST");
  });

  it("rejects missing or empty messages with 400", async () => {
    const response = await POST(request(JSON.stringify({ messages: [] })));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("INVALID_REQUEST");
  });

  it("rejects unsupported roles with 400", async () => {
    const response = await POST(
      request(JSON.stringify({ messages: [{ role: "system", content: "hi" }] }))
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("INVALID_REQUEST");
  });

  it("rejects messages that exceed the maximum length with 400", async () => {
    const response = await POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "x".repeat(MAX_MESSAGE_LENGTH + 1) }],
        })
      )
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("MESSAGE_TOO_LONG");
  });
});
