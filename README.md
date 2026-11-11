# ZecHub bounty alerts

Get notified when a new bounty is posted on [ZEC Bounties](https://bounties.zechub.wiki).

A GitHub Action checks the public bounty list every 10 minutes. For each new bounty that is approved, public and still open, it opens an issue in this repo with the reward, deadline, category, team and an "Open the bounty and apply" link. Bounties in your categories get a `matches-you` label. GitHub then notifies you by email and in the GitHub mobile app.

It can also send a Telegram message for each new bounty (optional, see below).

## Setup

1. Keep this repo **public**. Scheduled Actions are free on public repos. On a private repo, a check every 10 minutes uses more than the free monthly minutes.
2. Make sure you are watching the repo (Watch > All Activity) so GitHub notifies you about new issues.
3. Run it once by hand: Actions > ZecHub bounty alerts > Run workflow.

On the first run it alerts the bounties that are open and were posted in the last 3 days. After that, only new ones.

## Telegram (optional)

1. In Telegram, message @BotFather, send `/newbot` and follow the steps. It gives you a bot token.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<token>/getUpdates` in a browser and copy `chat.id`.
3. In this repo: Settings > Secrets and variables > Actions > New repository secret. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
4. Test it: Actions > ZecHub bounty alerts > Run workflow, tick "Only send a Telegram test message", then Run. Your bot should message you.

The token is only read from the secret and is never printed in the logs.

## Settings

Set these in the workflow file (`.github/workflows/bounty-alerts.yml`):

| Variable | Default | What it does |
|---|---|---|
| `MATCH_CATEGORIES` | `Design and Videos,Web Development` | Categories that get the `matches-you` label |
| `LOOKBACK_DAYS` | `3` | Ignore bounties posted earlier than this |
| `MAX_PER_RUN` | `10` | Most alerts in one run |

## Notes

- GitHub can start scheduled runs a few minutes late, and turns off schedules on a public repo after 60 days without any commits. Re-enable it from the Actions tab if that happens.
- Text from the bounty site is cleaned before it goes into an issue, so it cannot @-mention anyone or link to issues here.
- Tests: `npm test` (Node 20+, no dependencies).
