# Fence Trading

Fence Trading is a community-first trading platform for broker onboarding, Discord/Telegram verification, signal performance, education, challenges, and reward loops.

## Current Stack

- Next.js 14 app router
- Tailwind CSS
- SQLite via `better-sqlite3` for web signal data
- Python scripts for Telegram signal handling, Discord registration, and Trade Nation affiliate verification

## Current MVP Flow

- `/`: public landing page with broker CTA, signal stats, and risk/affiliate disclosure.
- `/performance`: full signal history and performance page.
- `/platforms`: broker, TradingView, and FlockTrade platform overview.
- `/membership`: access model for verified users, strategy add-on, and future tools.
- `/verify`: website verification form for broker name, country, email, Discord, and Telegram.
- `/admin`: token-protected admin view for pending, rejected, and verified registrations.
- `/api/registrations`: writes website submissions to the shared `pending_requests` table in `affiliates.db`.
- `/api/admin/registrations`: admin API for listing and updating registration queue status.
- `/api/signals`: reads recent signal history from `web_signals.db`.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` for the website and to `scripts/fenceWeb.env` for the Python scripts if you run the bot stack locally.

Use `REGISTRATION_DB_PATH` if the website and Discord bot should share a specific verification database path. If omitted, the website falls back to `DB_PATH` and then `affiliates.db`.

Set `ADMIN_TOKEN` before using `/admin`. The admin page stores the token locally in your browser and sends it as a bearer token to the admin API.

For local repeat testing, `ALLOW_TEST_DUPLICATES=true` lets `TEST_DUPLICATE_NAME` submit multiple pending registrations. Keep it off in production.

## Admin Verification Flow

1. Open `/admin` and enter `ADMIN_TOKEN`.
2. Review pending requests from website and Discord.
3. Check the matching user in the Trade Nation affiliate portal.
4. If matched, use "Manual verification" with the pending request ID and Trade Nation user ID.
5. The request is marked `verified` and copied into `affiliates`.
6. Rejected requests can be restored to pending if needed.

Trade Nation registrations may take around one hour to appear in the affiliate report. The automatic runner should normally run hourly, while pending users wait in the queue.

## Important Security Note

Real bot tokens, Telegram API credentials, affiliate credentials, email passwords, SQLite databases, browser screenshots, session files, and logs must stay out of Git. Rotate any token that has previously been committed or shared in a ZIP.

## Key Scripts

- `scripts/fence_discord_bot.py`: Discord registration commands and pending request storage.
- `scripts/affiliate_verifier.py`: Trade Nation report scraper, verification, Telegram invite generation, and welcome email flow.
- `scripts/verification_runner.py`: recurring verification loop that reads `pending_requests`, scrapes Trade Nation, verifies matches, and sends welcome links.
- `scripts/telegram_invite_check.py`: checks Telegram bot access and one-time invite generation for configured channels.
- `scripts/fence_relay_v3.py`: Telegram signal relay flow.
- `scripts/sync_db_to_website.py`: Website signal database sync helper.

## Product Direction

See `docs/PLATFORM_PLAN.md` for the current platform plan, agent structure, compliance guardrails, and MVP roadmap.

See `docs/DEPLOYMENT_PLAN.md` for the parallel launch strategy and DNS cutover checklist.

See `docs/VERIFICATION_AUTOMATION.md` for the automatic Trade Nation verification runner.
