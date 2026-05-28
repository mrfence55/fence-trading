# Fence Trading Platform Plan

## Positioning

Fence Trading should be built as a disciplined trading community, not as a raw broker funnel. Broker registration unlocks access, but the visible value is education, community, tools, transparent signal tracking, and reward-based challenges.

Primary language: Norwegian first, English next.

Primary community: Discord.

Signal and acquisition layer: Telegram plus social channels.

Broker: Trade Nation affiliate partnership.

## Core Platform Loops

### Acquisition

- Instagram, X, TikTok, Facebook, Telegram, and creator partnerships.
- Separate Telegram channels for different angles: beginner education, market briefs, signals, challenges, and tools.
- Daily content with reusable series: risk rule, setup breakdown, challenge update, signal recap, tool spotlight, and trader mistake breakdown.
- First budget: 10,000 NOK for tests across paid ads, partnerships, and giveaways.

### Conversion

- Landing page explains value before broker CTA.
- Broker signup unlocks verified Discord role, Telegram invite, signal archive, education, and challenge eligibility.
- Verification should work from website, Discord, or Telegram and write to the same registration database.
- Every CTA should carry clear affiliate disclosure and risk context.

### Retention

- Discord roles for verified, active trader, consistent trader, mentor, top referrer, and challenge participant.
- Daily prompts, weekly trading review, monthly challenge, and market debrief.
- Strategy materials and TradingView indicator access for paid upsell.
- FlockTrade can be positioned as a platform perk/tool layer before considering white label.

### Rewards

Use a composite reward score instead of rewarding volume alone:

- Referral score
- Verified activity score
- Consistency score
- Risk management / education score
- Community contribution score
- Optional volume score with guardrails

Giveaways should have clear rules, eligibility, and anti-abuse checks.

## Agent And Skill Structure

- UI/UX Agent: improves landing page, onboarding, dashboards, and mobile flow.
- Content Agent: drafts daily social posts, Telegram posts, reels scripts, carousels, and community prompts.
- Growth Agent: finds ad angles, partnerships, Telegram opportunities, and competitor patterns.
- Community Agent: proposes Discord roles, events, challenges, and retention loops.
- Compliance Agent: checks claims, disclaimers, affiliate disclosure, results presentation, and risky wording before publish.
- Analytics Agent: weekly KPI report for registrations, active traders, lots, channel source, CPA, retention, and content performance.
- Automation Agent: keeps Discord, Telegram, affiliate reports, email, and reward scoring connected.
- Strategy Product Agent: turns the simple trading strategy into a sellable product with TradingView code, setup guide, visuals, FAQ, and onboarding.

## Compliance Guardrails

- Do not guarantee profit or imply that users will become profitable.
- Do not frame signals as personal financial advice.
- Disclose affiliate relationship clearly.
- Show trading risk near CTAs and results.
- Document result methodology: period, market, assumptions, fees/spread handling, and whether results are hypothetical or live.
- Avoid rewards that push reckless trading, excessive leverage, or pure volume chasing.
- Confirm Trade Nation affiliate terms for Discord, Telegram, paid ads, giveaways, broker logo usage, and geo restrictions.

## Technical Target Architecture

- Next.js app for public site, onboarding, signal performance, and admin surfaces.
- Supabase/Postgres as the long-term system of record.
- SQLite can remain for the current signal MVP.
- Discord bot for registration, verification status, role assignment, challenge prompts, and reward updates.
- Telegram bot for invites, signal publishing, onboarding reminders, and channel segmentation.
- Background workers or n8n for scheduled reports, scraping/imports, and content workflows.
- PostHog or Plausible for funnel analytics.

## Deployment Direction

The existing VPS site should keep running independently while the new platform is developed in parallel. Launch the new app under a staging subdomain first, then move `fencetrading.no` only after onboarding, verification, signal pages, and bot flows are tested.

See `docs/DEPLOYMENT_PLAN.md`.

## MVP Roadmap

### Phase 1: Stabilize Current Project

- Remove secrets from code and rotate exposed tokens.
- Add env templates and deployment notes.
- Add `/api/signals` route for the current frontend.
- Remove duplicate ZIP artifacts, nested project copy, logs, `.next`, `node_modules`, and local DBs from source control.
- Replace risky landing page claims with safer community-first copy.

### Phase 2: Onboarding And Verification

- Create a single registration schema for website, Discord, and Telegram. Started with shared `pending_requests` table.
- Add website verification form. Initial `/verify` MVP is in place.
- Add admin review page for pending/verified users. Initial `/admin` MVP is in place with token-protected queue view and manual verification.
- Connect Discord roles after verification.
- Generate one-time Telegram invite after verification.

### Phase 3: Product And Community

- Add strategy sales page.
- Add signal methodology and performance page.
- Add challenge/rewards page.
- Add FlockTrade tools/perks page.
- Add Norwegian-first content library.

### Phase 4: Growth Automation

- Add content calendar and approval queue.
- Add compliance checklist before publish.
- Add weekly analytics report.
- Add A/B testing for CTA, hero copy, and onboarding path.
- Add partner/outreach tracker.

## First 30 Days

- Week 1: technical cleanup, token rotation, website copy, registration flow, Discord roles.
- Week 2: signal performance page, challenge rules, reward scoring draft, first content batch.
- Week 3: launch Norwegian MVP, run small ad tests, start partnerships/outreach.
- Week 4: analyze CPA, verified users, active traders, lots, retention, and community engagement; then double down on the best channel.
