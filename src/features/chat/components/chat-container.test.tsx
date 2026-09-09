import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatContainer } from "@/features/chat/components/chat-container";
import { ChatRequestError, sendChatMessage } from "@/lib/api/chat";
import { CHAT_STORAGE_KEY } from "@/features/chat/storage";
import type { ChatMessage } from "@/features/chat/types";

vi.mock("@/lib/api/chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/chat")>();
  return { ...actual, sendChatMessage: vi.fn() };
});

const mockedSend = vi.mocked(sendChatMessage);

const seeds = (): ChatMessage[] => [
  { id: "1", role: "user", content: "Hi! What can you help me with?" },
  { id: "2", role: "assistant", content: "I can help with many things." },
];

const assistantReply: ChatMessage = { id: "a1", role: "assistant", content: "Assistant response." };

const pendingReply = () => {
  let resolveReply!: (message: ChatMessage) => void;
  mockedSend.mockImplementationOnce(
    () => new Promise<ChatMessage>((resolve) => (resolveReply = resolve))
  );
  return () => act(() => resolveReply(assistantReply));
};

describe("ChatContainer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    mockedSend.mockReset();
    window.confirm = () => true;
  });

  it("renders the initial messages", async () => {
    render(<ChatContainer initialMessages={seeds()} />);
    expect(await screen.findByText("Hi! What can you help me with?")).toBeTruthy();
    expect(screen.getByText("I can help with many things.")).toBeTruthy();
  });

  it("submits a valid message, shows the user bubble immediately, and posts the full conversation snapshot", async () => {
    const unresolved = pendingReply();
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "How's it going?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("How's it going?")).toBeTruthy();
    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(1));
    expect(mockedSend.mock.calls[0][0]).toEqual([
      ...seeds(),
      { id: expect.any(String), role: "user", content: "How's it going?" },
    ]);

    unresolved();
    expect(await screen.findByText("Assistant response.")).toBeTruthy();
  });

  it("shows a typing indicator and disables the controls while loading", async () => {
    const unresolved = pendingReply();
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "Hello bot");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Assistant is typing…")).toBeTruthy();
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear Chat" })).toBeDisabled();

    unresolved();
    await waitFor(() => expect(screen.queryByText("Assistant is typing…")).toBeNull());
    expect(await screen.findByText("Assistant response.")).toBeTruthy();
    expect(screen.getByLabelText("Message")).toBeEnabled();
  });

  it("displays a user-facing error and clears loading state on failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSend.mockRejectedValueOnce(new ChatRequestError("PROVIDER_ERROR", "boom", 502));
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "Hello bot");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The AI service is temporarily unavailable. Please try again.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByText("Assistant is typing…")).toBeNull();
    expect(screen.queryByText("Assistant response.")).toBeNull();
  });

  it("maps a network failure to the connection message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSend.mockRejectedValueOnce(new ChatRequestError("NETWORK_ERROR", "offline", 0));
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "Hello bot");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reach the AI service. Please check your connection and try again."
    );
  });

  it("does not offer retry for non-retryable failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSend.mockRejectedValueOnce(new ChatRequestError("INVALID_REQUEST", "bad", 400));
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "Hello bot");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("retries with the SAME conversation snapshot and does not duplicate the user message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSend
      .mockRejectedValueOnce(new ChatRequestError("NETWORK_ERROR", "offline", 0))
      .mockResolvedValueOnce(assistantReply);
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "Retry me");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByRole("alert");
    expect(screen.getAllByText("Retry me")).toHaveLength(1);
    const firstSnapshot = mockedSend.mock.calls[0][0];

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Assistant response.")).toBeTruthy();
    expect(mockedSend).toHaveBeenCalledTimes(2);
    expect(mockedSend.mock.calls[1][0]).toEqual(firstSnapshot);
    expect(screen.getAllByText("Retry me")).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not submit or call the API for whitespace-only input", async () => {
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "   ");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(mockedSend).not.toHaveBeenCalled());
    expect(screen.getByText("Hi! What can you help me with?")).toBeTruthy();
  });

  it("guards against duplicate submission while a request is in flight", async () => {
    const unresolved = pendingReply();
    render(<ChatContainer initialMessages={seeds()} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "rapid" } });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });

    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("rapid")).toHaveLength(1);

    unresolved();
    expect(await screen.findByText("Assistant response.")).toBeTruthy();
    expect(screen.getAllByText("rapid")).toHaveLength(1);
  });

  it("clears the conversation back to the seeds without calling the API", async () => {
    render(<ChatContainer initialMessages={seeds()} />);
    await screen.findByText("Hi! What can you help me with?");

    await userEvent.setup().click(screen.getByRole("button", { name: "Clear Chat" }));

    expect(screen.getByText("Hi! What can you help me with?")).toBeTruthy();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("keeps the conversation when the clear confirmation is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);
    await screen.findByText("Hi! What can you help me with?");

    await user.type(screen.getByLabelText("Message"), "Keep me");
    await user.click(screen.getByRole("button", { name: "Clear Chat" }));

    expect(screen.getByText("Keep me")).toBeTruthy();
  });

  it("clearing an error state resets the conversation and removes retry, with no extra API call", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSend.mockRejectedValueOnce(new ChatRequestError("NETWORK_ERROR", "offline", 0));
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={seeds()} />);

    await user.type(screen.getByLabelText("Message"), "Will fail");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Clear Chat" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByText("Hi! What can you help me with?")).toBeTruthy();
    expect(mockedSend).toHaveBeenCalledTimes(1);
  });

  it("restores a persisted conversation instead of the seeds", async () => {
    const saved: ChatMessage[] = [
      { id: "r1", role: "user", content: "RESTORED MARKER" },
      { id: "r2", role: "assistant", content: "Restored reply." },
    ];
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(saved));
    render(<ChatContainer initialMessages={seeds()} />);

    expect(await screen.findByText("RESTORED MARKER")).toBeTruthy();
    expect(screen.getByText("Restored reply.")).toBeTruthy();
    expect(screen.queryByText("Hi! What can you help me with?")).toBeNull();
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "[]")).toEqual(saved)
    );
  });

  it("sends the complete conversation when a user follows up (context snapshot)", async () => {
    const contextSeeds: ChatMessage[] = [
      { id: "1", role: "user", content: "Explain API gateways." },
      {
        id: "2",
        role: "assistant",
        content: "An API gateway is a server that sits in front of your APIs.",
      },
    ];
    mockedSend.mockResolvedValueOnce(assistantReply);
    const user = userEvent.setup();
    render(<ChatContainer initialMessages={contextSeeds} />);

    await user.type(screen.getByLabelText("Message"), "How does it work?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(1));
    expect(mockedSend.mock.calls[0][0]).toEqual([
      ...contextSeeds,
      { id: expect.any(String), role: "user", content: "How does it work?" },
    ]);
  });
});
