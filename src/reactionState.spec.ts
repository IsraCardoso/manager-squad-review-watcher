import { test, expect } from "bun:test";
import { terminalReaction, replyMessage } from "./reactionState";

const USER = "U0EXAMPLE1ID";

test("approved -> heavy_check_mark + approved message", () => {
  expect(terminalReaction("approved")).toBe("heavy_check_mark");
  expect(replyMessage("approved", USER)).toBe(`<@${USER}> Aprovado ✔️`);
});

test("approved_with_comment -> heavy_check_mark + comment message", () => {
  expect(terminalReaction("approved_with_comment")).toBe("heavy_check_mark");
  expect(replyMessage("approved_with_comment", USER)).toContain("já está aprovado");
});

test("changes_requested -> speech_balloon + changes message", () => {
  expect(terminalReaction("changes_requested")).toBe("speech_balloon");
  expect(replyMessage("changes_requested", USER)).toContain("me marque aqui de novo");
});
