import { test, expect } from "bun:test";
import { isWithinOperatingHours } from "./operatingHours";

test("undefined operatingHours means always on", () => {
  expect(isWithinOperatingHours(undefined, new Date(2026, 0, 1, 3, 0))).toBe(true);
});

test("null operatingHours means always on", () => {
  expect(isWithinOperatingHours(null, new Date(2026, 0, 1, 3, 0))).toBe(true);
});

test("inside window returns true", () => {
  const hours = { start: "08:00", end: "18:00" };
  expect(isWithinOperatingHours(hours, new Date(2026, 0, 1, 9, 30))).toBe(true);
});

test("before window returns false", () => {
  const hours = { start: "08:00", end: "18:00" };
  expect(isWithinOperatingHours(hours, new Date(2026, 0, 1, 7, 59))).toBe(false);
});

test("at start boundary returns true", () => {
  const hours = { start: "08:00", end: "18:00" };
  expect(isWithinOperatingHours(hours, new Date(2026, 0, 1, 8, 0))).toBe(true);
});

test("at end boundary returns false (end is exclusive)", () => {
  const hours = { start: "08:00", end: "18:00" };
  expect(isWithinOperatingHours(hours, new Date(2026, 0, 1, 18, 0))).toBe(false);
});
