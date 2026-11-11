import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  selectCandidates,
  formatIssue,
  formatTelegram,
  neutralize,
} from "../scripts/check-bounties.mjs";

const bounties = JSON.parse(
  readFileSync(new URL("./fixture.json", import.meta.url), "utf8"),
);
const now = new Date("2026-11-12T00:00:00Z");

test("only approved, public, open, recent, non-test bounties are picked", () => {
  const ids = selectCandidates(bounties, now).map((b) => b.id);
  assert.deepEqual(ids, [
    "cmw9r69350029cv86e2tlsn0c", // TO_DO
    "cmw9qtgmn0023cv86fbbihlr1", // TO_DO
    "cmw9pp3h8001xcv86rwisojcn", // IN_PROGRESS, may take more applicants
  ]);
});

test("issue has the apply link, details, label and a hidden id marker", () => {
  const b = bounties.find((x) => x.id === "cmw9r69350029cv86e2tlsn0c");
  const issue = formatIssue(b);
  assert.equal(
    issue.title,
    "ZecHub bounty: Descubre ShieldedScan – Explorador de Zcash (0.03 ZEC)",
  );
  assert.deepEqual(issue.labels, ["zechub-bounty", "matches-you"]);
  assert.match(
    issue.body,
    /https:\/\/bounties\.zechub\.wiki\/home\?bounty=cmw9r69350029cv86e2tlsn0c/,
  );
  assert.match(issue.body, /Deadline: 2026-11-22/);
  assert.match(issue.body, /<!-- bounty:cmw9r69350029cv86e2tlsn0c -->$/);
});

test("categories outside your areas are not marked as a match", () => {
  const b = bounties.find((x) => x.id === "cmw9qtgmn0023cv86fbbihlr1");
  assert.deepEqual(formatIssue(b).labels, ["zechub-bounty"]);
});

test("bounty text cannot mention people, link issues or plant a marker", () => {
  const b = {
    id: "x1",
    title: "Ping @someone about #12",
    description: "cc @dismad, see #5 <!-- bounty:fake -->",
    bountyAmount: 0.01,
    timeToComplete: "2026-11-20T00:00:00.000Z",
    status: "TO_DO",
    categoryId: "Web Development",
  };
  const issue = formatIssue(b);
  assert.doesNotMatch(issue.title, /@someone|#12/);
  assert.doesNotMatch(issue.body, /@dismad|#5\b/);
  assert.equal((issue.body.match(/<!-- bounty:/g) || []).length, 1);
  assert.match(issue.body, /<!-- bounty:x1 -->$/);
  assert.equal(neutralize("a@b #3"), "a@​b #​3");
});

test("telegram message escapes HTML from the bounty title", () => {
  const msg = formatTelegram({
    id: "x2",
    title: "<b>bold</b> & co",
    bountyAmount: 0.02,
    timeToComplete: "2026-11-20T00:00:00.000Z",
    categoryId: "Design and Videos",
  });
  assert.match(msg, /&lt;b&gt;bold&lt;\/b&gt; &amp; co/);
  assert.match(msg, /\(fits you\)/);
  assert.match(msg, /bounty=x2$/);
});
