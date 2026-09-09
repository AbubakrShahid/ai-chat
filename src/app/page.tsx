import { ChatContainer } from "@/features/chat/components/chat-container";
import type { ChatMessage } from "@/features/chat/types";

/**
 * Seed messages used to render an initial conversation. Passed from this
 * Server Component into the client ChatContainer as serializable props;
 * ownership of the conversation moves to ChatContainer after that. These
 * messages are real conversation content displayed in the UI, so they are also
 * included in the context sent to the AI provider on the first request.
 */
const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Hi! What can you help me with?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "I can help with many things — writing and editing, brainstorming, summarizing information, and answering questions. What would you like to work on?",
  },
];

/**
 * Home — the root route's Server Component.
 *
 * Composes the page and passes initial, serializable data down to the chat
 * feature. It stays a Server Component; application state (messages + loading)
 * lives in the client ChatContainer.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <section aria-labelledby="app-title" className="max-w-2xl">
        <h1
          id="app-title"
          className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          Talk with an AI assistant
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          A production-quality chat experience.
        </p>
      </section>

      <ChatContainer initialMessages={initialMessages} />
    </main>
  );
}
