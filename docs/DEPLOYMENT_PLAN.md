# Deployment Plan

## Current Live Site

The existing VPS site can continue running independently:

- `http://173.214.167.219:3000/`
- `http://173.214.167.219:3000/performance`

Do not migrate or modify that instance as part of the new build unless we explicitly decide to replace it later.

## Recommended Parallel Launch

Build and launch the new Fence Trading platform in parallel under a staging subdomain first:

1. Keep the existing VPS untouched.
2. Deploy the new app to a separate environment.
3. Point `staging.fencetrading.no` or `new.fencetrading.no` to the new environment.
4. Test `/`, `/verify`, `/api/signals`, and `/api/registrations`.
5. Confirm Discord/Telegram verification flow.
6. Move `fencetrading.no` only when the new platform is stable.

## Hosting Recommendation

The current app is a dynamic Next.js application using API routes and SQLite through `better-sqlite3`. That means it needs a Node.js runtime, not only static file hosting.

Best options:

- Vercel for the public Next.js website and API routes.
- A small VPS for bots, scraping, Telegram, Discord, and scheduled verification jobs.
- one.com VPS if we want to keep hosting and domain management closer together.

Use regular one.com shared hosting only if the site is exported as static HTML and all dynamic API/database features are moved elsewhere.

## Domain Strategy

Suggested DNS flow:

- `fencetrading.no`: current production until new site is ready.
- `new.fencetrading.no` or `staging.fencetrading.no`: new app.
- `api.fencetrading.no`: optional backend/API later.
- `bot.fencetrading.no`: optional bot/admin service later.

## Cutover Checklist

- Rotate exposed Telegram/bot credentials.
- Confirm broker affiliate link and approved marketing language.
- Add production env vars.
- Confirm `/verify` writes to the intended registration database.
- Confirm Discord bot can read the same pending requests.
- Confirm Telegram invite generation.
- Confirm signal performance page and risk disclosure.
- Add analytics.
- Test mobile layout.
- Switch DNS only after the staging URL passes checks.
