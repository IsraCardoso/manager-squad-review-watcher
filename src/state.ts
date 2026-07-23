import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const STATE_PATH = ".state/last-seen.json";

type CursorMap = Record<string, string>;

function readCursorMap(path: string): CursorMap {
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as CursorMap;
    return {};
  } catch {
    return {};
  }
}

export function readCursor(channelId: string, path = STATE_PATH): string | null {
  const map = readCursorMap(path);
  return map[channelId] ?? null;
}

export function writeCursor(channelId: string, ts: string, path = STATE_PATH): void {
  const map = readCursorMap(path);
  map[channelId] = ts;
  const dir = dirname(path);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(map, null, 2));
}
