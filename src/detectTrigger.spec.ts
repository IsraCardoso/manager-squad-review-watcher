import { test, expect } from "bun:test";
import { detectTrigger } from "./detectTrigger";

const config = {
  managerSquadSubteamId: "S0EXAMPLE1SQ",
  slackUserId: "U0EXAMPLE1ID",
};

test("group mention + PR link in the same root message triggers", () => {
  const root = {
    ts: "1.1",
    text: "<!subteam^S0EXAMPLE1SQ> devel: https://github.com/acme-corp/backend-api/pull/1007",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(true);
  expect(result.prUrl).toBe("https://github.com/acme-corp/backend-api/pull/1007");
});

test("user mention in root, PR link only in a thread reply, triggers from the thread", () => {
  const root = { ts: "2.1", text: "<@U0EXAMPLE1ID> pode revisar esse PR?" };
  const replies = [{ ts: "2.2", text: "aqui: https://github.com/acme-corp/billing-service/pull/642" }];
  const result = detectTrigger(root, replies, config);
  expect(result.triggered).toBe(true);
  expect(result.prUrl).toBe("https://github.com/acme-corp/billing-service/pull/642");
});

test("mention with no PR link anywhere does not trigger (R3)", () => {
  const root = { ts: "3.1", text: "<!subteam^S0EXAMPLE1SQ> alguem viu meu PR?" };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(false);
});

test("PR link present but no matching mention does not trigger", () => {
  const root = {
    ts: "4.1",
    text: "https://github.com/acme-corp/backend-api/pull/1007 sem mencao nenhuma",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(false);
});

test("plain-text '@manager-squad' (not Slack markup) does not trigger", () => {
  const root = {
    ts: "5.1",
    text: "@manager-squad https://github.com/acme-corp/backend-api/pull/1007",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(false);
});

test("thread started by the watcher's own owner is never reviewed, even with a valid mention+PR", () => {
  const root = {
    ts: "6.1",
    authorId: "U0EXAMPLE1ID",
    text: "<!subteam^S0EXAMPLE1SQ> devel: https://github.com/acme-corp/backend-api/pull/1007",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(false);
});

test("thread already carrying a white_check_mark reaction is treated as already reviewed and skipped", () => {
  const root = {
    ts: "7.1",
    authorId: "U0OTHERPERSON",
    reactions: ["white_check_mark"],
    text: "<!subteam^S0EXAMPLE1SQ> devel: https://github.com/acme-corp/backend-api/pull/1007",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(false);
});

test("thread already carrying speech_balloon (a real changes_requested review, e.g. from a colleague) is skipped -- not just success reactions count as already reviewed", () => {
  const root = {
    ts: "7.2",
    authorId: "U0OTHERPERSON",
    reactions: ["eyes", "speech_balloon"],
    text: "<!subteam^S0EXAMPLE1SQ> main: https://github.com/acme-corp/user-api/pull/1102",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(false);
});

test("thread from another author with no success reaction still triggers normally", () => {
  const root = {
    ts: "8.1",
    authorId: "U0OTHERPERSON",
    text: "<!subteam^S0EXAMPLE1SQ> devel: https://github.com/acme-corp/backend-api/pull/1007",
  };
  const result = detectTrigger(root, [], config);
  expect(result.triggered).toBe(true);
});
