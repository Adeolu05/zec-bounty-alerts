// Watches ZEC Bounties (bounties.zechub.wiki) and opens one GitHub issue per
// new bounty, so GitHub notifies you. If TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID are set, it also sends a Telegram message.
//
// Uses only Node 20+ built-ins. The bounty list is public and read without
// logging in. The issues themselves are the memory of what was already sent,
// so there is no state file to commit.

const API_URL =
  process.env.BOUNTY_API_URL ||
  "https://zechub.zone/api/bounties?limit=50&page=1";
const SITE_URL = "https://bounties.zechub.wiki/home?bounty=";
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 3);
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 10);
const MATCH_CATEGORIES = (
  process.env.MATCH_CATEGORIES || "Design and Videos,Web Development"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OPEN_STATUSES = new Set(["TO_DO", "IN_PROGRESS"]);
const MARKER = /<!-- bounty:([A-Za-z0-9_-]{1,64}) -->/;

// Bounties worth an alert: approved, public, still open, created recently,
// and not an admin's wallet test.
export function selectCandidates(bounties, now = new Date()) {
  const since = now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  return bounties.filter(
    (b) =>
      b &&
      typeof b.id === "string" &&
      b.isApproved === true &&
      b.isPrivate !== true &&
      OPEN_STATUSES.has(b.status) &&
      new Date(b.dateCreated).getTime() >= since &&
      !/^\s*(zcash\s+)?test\b/i.test(b.title || ""),
  );
}

// Text from the bounty site goes into GitHub markdown: stop it from
// @-mentioning people or linking issue numbers in this repo.
export function neutralize(text) {
  return String(text ?? "")
    .replace(/@/g, "@​")
    .replace(/#(\d)/g, "#​$1")
    .replace(/<!--/g, "&lt;!--");
}

export function formatIssue(b) {
  const team = b.team?.name || "ZecHub";
  const due = b.timeToComplete ? b.timeToComplete.slice(0, 10) : "not set";
  const matches = MATCH_CATEGORIES.includes(b.categoryId);
  const description = neutralize(b.description).trim().slice(0, 1500);
  const quoted = description
    ? description
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
    : "> (no description)";
  const title = neutralize(String(b.title || "Untitled").trim()).slice(0, 180);
  return {
    title: `ZecHub bounty: ${title} (${b.bountyAmount} ZEC)`,
    labels: matches ? ["zechub-bounty", "matches-you"] : ["zechub-bounty"],
    body: [
      `**[Open the bounty and apply](${SITE_URL}${encodeURIComponent(b.id)})**`,
      "",
      `- Reward: ${b.bountyAmount} ZEC`,
      `- Deadline: ${due}`,
      `- Status: ${b.status}`,
      `- Category: ${neutralize(b.categoryId || "none")}`,
      `- Team: ${neutralize(team)}`,
      `- Fits your areas: ${matches ? "yes" : "no"}`,
      "",
      quoted,
      "",
      `<!-- bounty:${b.id} -->`,
    ].join("\n"),
  };
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatTelegram(b) {
  const due = b.timeToComplete ? b.timeToComplete.slice(0, 10) : "not set";
  const fit = MATCH_CATEGORIES.includes(b.categoryId) ? " (fits you)" : "";
  return [
    `<b>New ZecHub bounty${fit}</b>`,
    escapeHtml(String(b.title || "").trim()),
    `${b.bountyAmount} ZEC, due ${due}, ${escapeHtml(b.categoryId || "")}`,
    `${SITE_URL}${encodeURIComponent(b.id)}`,
  ].join("\n");
}

async function github(path, options = {}) {
  const base = process.env.GITHUB_API_URL || "https://api.github.com";
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${options.method || "GET"} ${path}: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// Ids already alerted, read from the markers in this repo's issues.
async function alreadySent(repo) {
  const ids = new Set();
  for (let page = 1; page <= 10; page++) {
    const issues = await github(
      `/repos/${repo}/issues?state=all&labels=zechub-bounty&per_page=100&page=${page}`,
    );
    for (const issue of issues) {
      const m = MARKER.exec(issue.body || "");
      if (m) ids.add(m[1]);
    }
    if (issues.length < 100) break;
  }
  return ids;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  // Never print the token: report the status only.
  if (!res.ok) console.warn(`Telegram send failed: ${res.status}`);
  return res.ok;
}

async function main() {
  // Manual "send a test message" run, to check the Telegram secrets.
  if (process.env.TEST_TELEGRAM === "true") {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret is missing");
    }
    const ok = await sendTelegram(
      "<b>ZecHub bounty alerts are connected.</b>\nNew bounties will arrive here.",
    );
    if (!ok) throw new Error("Telegram test message failed");
    console.log("Telegram test message sent.");
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");
  }

  const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Bounty API: ${res.status}`);
  const payload = await res.json();
  const bounties = Array.isArray(payload) ? payload : payload.data || [];

  const sent = await alreadySent(repo);
  const fresh = selectCandidates(bounties)
    .filter((b) => !sent.has(b.id))
    .slice(0, MAX_PER_RUN);

  for (const b of fresh) {
    const issue = formatIssue(b);
    await github(`/repos/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify(issue),
    });
    await sendTelegram(formatTelegram(b));
    console.log(`Alerted: ${b.id}`);
  }
  console.log(`Checked ${bounties.length} bounties, ${fresh.length} new.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
