# Verification Automation

## What It Does

`scripts/verification_runner.py` can run in the background and:

1. Read pending requests from `affiliates.db`.
2. Log in to the Trade Nation affiliate portal.
3. Open the registrations report.
4. Match Trade Nation registrations against pending requests.
5. Move matched users into `affiliates`.
6. Optionally generate Telegram invite links and send a welcome email.

This means admin approval does not have to be manual 24/7 once the runner is deployed and stable.

Trade Nation registrations can take around one hour to appear in the affiliate report. Users can stay in `pending` until the next runner cycle sees their name.

## Required Env

Put these in `scripts/fenceWeb.env` on the machine running the runner:

```env
REGISTRATION_DB_PATH=../affiliates.db
TN_USERNAME=
TN_PASSWORD=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_BOT_TOKEN=
TELEGRAM_STATIC_INVITE_URL=
TG_MAIN_GROUP_ID=
TG_FORUM_GROUP_ID=
TG_TOPIC_MAIN_ID=12
TG_TOPIC_CRYPTO_ID=7
TG_TOPIC_AURORA_ID=2
TG_TOPIC_ODIN_ID=6
TG_TOPIC_LIVE_ID=8
TG_CRYPTO_CHANNEL_ID=
TG_AURORA_CHANNEL_ID=
TG_ODIN_CHANNEL_ID=
TG_LIVE_CHANNEL_ID=
TG_VIP_GROUP_ID=
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
DISCORD_INVITE_LINK=
VERIFICATION_CHECK_INTERVAL=3600
ALLOW_TEST_DUPLICATES=false
TEST_DUPLICATE_NAME=Oscar Gjerde
```

## Install Runner Dependencies

```powershell
pip install -r scripts/requirements.txt
python -m playwright install chromium
```

## Safe Test

Run one scrape/match cycle without verifying anyone:

```powershell
python scripts/verification_runner.py --once --dry-run
```

## Telegram Channel Setup

### Recommendation

Use bot-generated one-time links when Telegram allows it. This is the cleanest flow because every verified user receives a unique link that only one account can use.

The runner creates the Telegram link immediately before sending the welcome email. Bot API is tried first with `member_limit=1`, so each generated invite can only be used by one Telegram account.

If Telegram cannot generate a bot link for the chosen channel, use a static request-to-join/admin-approval invite link instead:

```env
TELEGRAM_STATIC_INVITE_URL=https://t.me/+yourInviteCode
```

Do not use a `web.telegram.org/k/#...` URL in customer email. That is an internal web client chat URL, not a public join invite. Use Telegram's invite format, normally `https://t.me/+...`.

### Recommended MVP: One Forum Group

If `Fence Trading` contains five Telegram topics/tråder, all topics share the same Telegram group ID. The link:

```text
https://web.telegram.org/k/#-3713831351
```

maps to this Bot API chat ID:

```env
TG_FORUM_GROUP_ID=-1003713831351
```

The individual sections are topics, not separate chats:

- `TG_TOPIC_AURORA_ID=2`
- `TG_TOPIC_ODIN_ID=6`
- `TG_TOPIC_MAIN_ID=12`
- `TG_TOPIC_CRYPTO_ID=7`
- `TG_TOPIC_LIVE_ID=8`

For posting, reading, and forwarding signals, use the forum group ID together with the topic ID. In Bot API terms this is `chat_id=-1003713831351` plus `message_thread_id=7` for Crypto, `message_thread_id=2` for Aurora, and so on.

For access control, the user only needs one invite link to the forum group. Once inside, they can see the five topics. Telegram invite links are group-level, not topic-level. `createChatInviteLink` only accepts the group `chat_id`; it cannot create a separate one-time invite for a specific topic.

To make this work:

1. Add the Telegram bot as admin in the actual forum group.
2. Give it permission to invite users.
3. Set `TG_MAIN_GROUP_ID=-1003713831351` or `TG_FORUM_GROUP_ID=-1003713831351`.
4. Test one-time invite creation:

```powershell
python scripts/telegram_invite_check.py --generate
```

If Telegram returns `Bad Request: chat not found`, the bot is not a member/admin in that exact group ID, or the wrong bot token is being used.

### Optional: Separate Channels

If you also keep separate Telegram channels named `Fence - Crypto`, `Fence - Aurora`, `Fence - Odin`, and `Fence - Live`, those have their own chat IDs and can receive separate invite links.

1. Add the Telegram bot as admin in each single channel users should receive access to.
2. Give the bot permission to invite users.
3. Put the channel IDs in `scripts/fenceWeb.env`.
4. Test bot access:

```powershell
python scripts/telegram_invite_check.py
```

5. Test one-time invite creation:

```powershell
python scripts/telegram_invite_check.py --generate
```

Use the single channels for onboarding first:

- `TG_CRYPTO_CHANNEL_ID` for Fence - Crypto
- `TG_AURORA_CHANNEL_ID` for Fence - Aurora
- `TG_ODIN_CHANNEL_ID` for Fence - Odin
- `TG_LIVE_CHANNEL_ID` for Fence - Live

`TG_MAIN_GROUP_ID` can be used for the all-in-one Fence Trading channel if Telegram allows the bot to create invite links there. If the main channel requires manual join approval and the bot cannot generate links for it, keep it out of the automated email for MVP.

## Verify Without Email

Useful while testing matching:

```powershell
python scripts/verification_runner.py --once --no-email
```

## Continuous Mode

Run every hour. This matches the expected Trade Nation report delay and is the recommended MVP setting:

```powershell
python scripts/verification_runner.py
```

Run every 15 minutes:

```powershell
python scripts/verification_runner.py --interval 900
```

## Important Notes

- Current matching is name-based, with country logged as a warning signal. This is acceptable for MVP if users are told to use the exact same full name as in Trade Nation.
- Duplicate registration protection blocks active/verified duplicates by email, Discord ID, Discord username, Telegram username, and same name+country.
- Local testing can allow repeated submissions for one configured name by setting `ALLOW_TEST_DUPLICATES=true` and `TEST_DUPLICATE_NAME=Oscar Gjerde`. Keep this disabled in production.
- Telegram invite generation sends one-time links for every configured `TG_*_CHANNEL_ID` where the bot has admin invite rights.
- The safest long-term upgrade is matching by a broker-side unique ID, postback, API, or verified email if Trade Nation can expose it.
- Use `--dry-run` after any Trade Nation portal UI change.
- Keep old pending test rows rejected or deleted so the queue stays clean.
