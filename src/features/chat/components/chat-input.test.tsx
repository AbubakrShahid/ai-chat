import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "@/features/chat/components/chat-input";
import { MAX_MESSAGE_LENGTH } from "@/features/chat/types";

describe("ChatInput", () => {
  it("renders a textarea and a submit button", () => {
    render(<ChatInput />);
    expect(screen.getByLabelText("Message")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
  });

  it("lets the user type a message", async () => {
    const user = userEvent.setup();
    render(<ChatInput />);
    const textarea = screen.getByLabelText("Message");
    await user.type(textarea, "Hello there");
    expect(textarea).toHaveValue("Hello there");
  });

  it("submits the typed content through the callback", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Message"), "  Hello there  ");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Hello there");
  });

  it("does not submit whitespace-only input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText("Message");
    await user.type(textarea, "   ");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the input and the submit button when disabled", () => {
    render(<ChatInput disabled />);
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("caps input at the max message length", () => {
    render(<ChatInput />);
    expect(screen.getByLabelText("Message")).toHaveAttribute(
      "maxlength",
      String(MAX_MESSAGE_LENGTH)
    );
  });

  it("shows a character counter near the limit and links it to the textarea", async () => {
    const user = userEvent.setup();
    render(<ChatInput />);
    const textarea = screen.getByLabelText("Message");
    await user.type(textarea, "a".repeat(MAX_MESSAGE_LENGTH - 100));
    const counter = screen.getByText(`${MAX_MESSAGE_LENGTH - 100}/${MAX_MESSAGE_LENGTH}`);
    expect(counter).toBeTruthy();
    expect(textarea).toHaveAccessibleDescription(
      `${MAX_MESSAGE_LENGTH - 100}/${MAX_MESSAGE_LENGTH}`
    );
  });

  it("hides the character counter (and aria-describedby) below the near-limit threshold", async () => {
    const user = userEvent.setup();
    render(<ChatInput />);
    const textarea = screen.getByLabelText("Message");
    await user.type(textarea, "short message");
    expect(screen.queryByText(/\/2000$/)).toBeNull();
    expect(textarea).not.toHaveAttribute("aria-describedby");
  });

  it("submits with Enter and does not reload the page", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Message"), "some content{enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("some content");
  });
});
