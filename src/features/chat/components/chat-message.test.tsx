import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/features/chat/components/chat-message";
import type { ChatMessage as ChatMessageType } from "@/features/chat/types";

const message = (overrides: Partial<ChatMessageType>): ChatMessageType => ({
  id: "1",
  role: "assistant",
  content: "",
  ...overrides,
});

describe("ChatMessage", () => {
  it("renders user messages as plain text", () => {
    render(<ChatMessage message={message({ role: "user", content: "Just some text.<b>/b>" })} />);
    expect(screen.getByText("Just some text.<b>/b>")).toBeTruthy();
  });

  it("does not interpret Markdown syntax in user messages", () => {
    render(<ChatMessage message={message({ role: "user", content: "# Heading" })} />);
    expect(screen.getByText("# Heading")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("renders the user label and assistant label", () => {
    render(
      <>
        <ChatMessage message={message({ id: "u", role: "user", content: "hi" })} />
        <ChatMessage message={message({ id: "a", role: "assistant", content: "hello" })} />
      </>
    );
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByText("Assistant")).toBeTruthy();
  });

  it("renders assistant Markdown headings", async () => {
    render(<ChatMessage message={message({ content: "# Big heading\n\ntext" })} />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Big heading");
  });

  it("renders assistant Markdown bold text", async () => {
    render(<ChatMessage message={message({ content: "This is **bold**." })} />);
    expect(await screen.findByText("bold")).toBeTruthy();
    expect(document.querySelector(".chat-markdown strong")).toHaveTextContent("bold");
  });

  it("renders assistant inline code that is not a code block", async () => {
    render(<ChatMessage message={message({ content: "Use `npm run build` here." })} />);
    const inline = document.querySelector(".chat-markdown :not(pre) > code");
    expect(inline).toBeTruthy();
    expect(inline).toHaveTextContent("npm run build");
    expect(document.querySelector(".chat-markdown pre")).toBeNull();
  });

  it("renders assistant fenced code blocks without throwing", async () => {
    render(
      <ChatMessage message={message({ content: "```javascript\nconst answer = 42;\n```" })} />
    );
    const code = document.querySelector(".chat-markdown pre code.hljs.language-javascript");
    expect(code).toBeTruthy();
    expect(code).toHaveTextContent("const answer = 42;");
  });

  it("keeps raw HTML / script content from executing", async () => {
    const content =
      'before <script>window.__s9_pwned = true</script> after <img src="x" onerror="window.__s9_pwned = true">';
    render(<ChatMessage message={message({ content })} />);
    await screen.findByText(/before/);
    expect(document.querySelector(".chat-markdown script")).toBeNull();
    expect(document.querySelector(".chat-markdown img")).toBeNull();
    expect((window as { __s9_pwned?: unknown }).__s9_pwned).toBeUndefined();
  });
});
