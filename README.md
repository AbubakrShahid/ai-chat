# AI Chat Application

A single-user AI chat application built with Next.js and OpenRouter. It supports
multi-turn conversations with context, Markdown-formatted responses with code
highlighting, local chat persistence, error recovery with retry, and an
automated test suite.

## Features

- **AI-powered chat** — assistant replies are generated via OpenRouter through a
  server-side route, so the page never reloads.
- **Multi-turn context** — the full conversation history is sent with every
  request, so follow-up questions have context.
- **Markdown responses** — assistant replies render Markdown, including tables,
  task lists, and strikethrough (GitHub-Flavored Markdown), plus fenced code
  blocks with syntax highlighting. User messages stay plain text.
- **Loading & input state** — a "typing" indicator shows while a request is in
  flight, and the input/send/clear controls are disabled to prevent duplicate
  submissions.
- **Input validation** — empty or whitespace-only input is rejected, messages
  are trimmed, and a 2000-character limit is enforced in the browser with a
  character counter and again on the server.
- **Error handling & retry** — network, timeout, and provider failures show a
  friendly, accessible message; retryable failures offer a "Try again" action
  that resends the exact same conversation snapshot without duplicating your
  message.
- **Persistence** — the conversation is saved to the browser's `localStorage`
  and restored on reload. "Clear Chat" resets the conversation without a page
  reload or API call.
- **Responsive UI** — Tailwind CSS with light/dark themes and accessible markup
  (labelled inputs, `aria-live` regions, keyboard-usable controls).
- **Automated tests** — a focused Vitest suite covers input behavior, Markdown
  rendering, chat state and retry logic, storage, the API client, and request
  validation.

## Tech Stack

| Concern     | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router)                                       |
| Language    | React 19, TypeScript (strict mode)                            |
| Styling     | Tailwind CSS                                                  |
| AI provider | OpenRouter (via a server-side Route Handler)                  |
| Markdown    | react-markdown + remark-gfm + rehype-highlight (highlight.js) |
| Testing     | Vitest, React Testing Library, user-event, jsdom              |
| Tooling     | pnpm, ESLint, Prettier                                        |

## Project Structure

```
src/
├── app/                  # Next.js routes, layout, and the /api/chat route
├── components/           # Shared UI (app header)
├── features/chat/        # Chat UI, state, types, and LocalStorage persistence
└── lib/                  # API client and server-side environment access
```

Chat state lives in one client component (`ChatContainer`) and is passed down
through typed props to presentational components. All AI access flows through a
single server-side route; the browser never talks to OpenRouter directly.

## Prerequisites

- **Node.js 18.18 or newer** (Next.js 16 requirement)
- **pnpm** (the project pins `pnpm@12.3.4` via `packageManager`)

## Getting Started

```bash
git clone <repository-url>
cd ai-chat
pnpm install
```

## Environment Configuration

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Add the following to `.env.local`:

- `OPENROUTER_API_KEY` — your key from https://openrouter.ai/keys
- `OPENROUTER_MODEL` — an OpenRouter model slug, e.g. `openrouter/free`
  (free-model availability changes, so verify the current catalog first)

> The API key is read only in server-side code. Never expose it through a
> `NEXT_PUBLIC_` variable or commit a real value.

## Running Locally

```bash
pnpm dev
```

Open http://localhost:3000. To verify the production build:

```bash
pnpm build
pnpm start
```

## Testing

The project uses **Vitest** with **React Testing Library** and **user-event**
in a jsdom environment. Tests target important application behavior rather than
implementation details, and network/AI calls are mocked — no API key or internet
access is required.

```bash
pnpm test              # run the suite once
pnpm test:watch        # watch mode
```

Covered areas: chat input submission and validation, Markdown rendering (and
safe handling of raw HTML), chat state including loading/error/retry, chat
persistence, API client success and error paths, and request validation.

## Quality Commands

```bash
pnpm lint            # ESLint check
pnpm typecheck       # TypeScript type checking
pnpm format          # format files with Prettier
pnpm format:check    # verify formatting without changing files
pnpm build           # production build
```

## How It Works

```
User → Chat UI → POST /api/chat → OpenRouter → reply → Chat UI
```

`ChatContainer` owns the conversation and loading state. Submitting a message
sends the whole conversation to the Next.js route handler, which validates it,
calls OpenRouter with the API key (which never leaves the server), and returns
the assistant's reply to be appended to the chat.

## Error Handling

- Empty or whitespace-only messages are never submitted.
- Messages over 2000 characters are rejected.
- Loading state disables the input and actions, with an additional in-flight guard to prevent duplicate submissions.
- Network, timeout, and provider failures surface a clear message; the request
  can be retried without losing context or duplicating your message.

## Security Notes

- The OpenRouter API key is server-side only.
- Client input is validated again on the server before reaching the provider.
- Markdown is rendered safely: raw HTML execution is not enabled, unsafe URL
  protocols (like `javascript:`) are stripped, and no `dangerouslySetInnerHTML`
  is used.
- `localStorage` data is validated before it is restored.

## Architecture Notes

- Next.js App Router with a server-side Route Handler as the only AI entry
  point.
- Chat state is feature-local — no global state library is needed.
- Persistence is browser-local via `localStorage`; there is no database or
  server-side history, which keeps the app dependency-free.
- Feature-oriented components keep chat code isolated from shared UI.

## Current Limitations

Scope decisions for this assessment:

- Chat history lives in the browser only (no accounts, auth, or server-side
  persistence).
- Responses are not streamed.
- Free OpenRouter models can vary in availability and latency.
