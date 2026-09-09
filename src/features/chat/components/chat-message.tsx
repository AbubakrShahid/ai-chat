import type { ChatMessage as ChatMessageType } from "@/features/chat/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/**
 * ChatMessage — renders a single chat message.
 *
 * Purely presentational: it receives everything it needs through props and
 * neither holds application state nor performs logic.
 *
 * Rendering differs by role:
 * - User messages are plain text, rendered with `whitespace-pre-wrap` so the
 *   original line breaks are preserved exactly. User input is intentionally
 *   NOT parsed as Markdown (the AI's responses are the Markdown-formatted
 *   content).
 * - Assistant messages are rendered as Markdown via `react-markdown`, with
 *   `remark-gfm` for GitHub-Flavored Markdown (tables, task lists,
 *   strikethrough) and `rehype-highlight` (highlight.js) for syntax
 *   highlighting of fenced code blocks. Markdown text remains the message
 *   content in application state; rendering is purely a presentation concern.
 *
 * ReactMarkdown uses `useState`/`useEffect`, so it must live in the client
 * bundle. ChatMessage already sits in the client module graph (imported by
 * ChatWindow, which is imported by the "use client" ChatContainer), so it needs
 * no directive of its own and no code here ever touches the DOM directly.
 *
 * Security: react-markdown never renders raw HTML from the source (no
 * `rehype-raw`), and its default URL transform strips unsafe protocols such as
 * `javascript:`. No `dangerouslySetInnerHTML` is used anywhere.
 */
export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide opacity-60">
          {isUser ? "You" : "Assistant"}
        </span>
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="chat-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
