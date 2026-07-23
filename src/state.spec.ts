import { test, expect, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { readCursor, writeCursor } from "./state";

const TMP = ".state/test-last-seen.json";

afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP);
});

test("readCursor returns null when no state file exists", () => {
  expect(readCursor("C123", TMP)).toBeNull();
});

test("writeCursor then readCursor returns the same timestamp", () => {
  writeCursor("C123", "1784829843.356929", TMP);
  expect(readCursor("C123", TMP)).toBe("1784829843.356929");
});

test("writing a cursor for one channel does not clobber another channel's cursor", () => {
  writeCursor("C_A", "1.1", TMP);
  writeCursor("C_B", "2.2", TMP);
  expect(readCursor("C_A", TMP)).toBe("1.1");
  expect(readCursor("C_B", TMP)).toBe("2.2");
});

test("corrupted state file is treated as absent, not a crash", () => {
  mkdirSync(".state", { recursive: true });
  writeFileSync(TMP, "{not valid json");
  expect(readCursor("C123", TMP)).toBeNull();
});
