import { describe, expect, it } from "vitest";
import { toUserMessage } from "./user-messages";

describe("toUserMessage", () => {
  it("maps ledger errors to friendly copy", () => {
    expect(
      toUserMessage(new Error("Invalid expense: need positive amount and at least one splitter"), "expense-preview"),
    ).toContain("amount");
  });

  it("passes through short user-facing strings", () => {
    expect(toUserMessage(new Error("That roommate is already on the list"), "expense")).toBe(
      "That roommate is already on the list",
    );
  });

  it("hides technical stack traces", () => {
    const msg = toUserMessage(new Error("TypeError: Cannot read properties of undefined"), "generic");
    expect(msg).not.toContain("TypeError");
    expect(msg).toContain("Something went wrong");
  });

  it("handles action-style errors", () => {
    expect(toUserMessage({ error: "Only an admin can delete expenses" }, "expense")).toContain("permission");
  });
});
