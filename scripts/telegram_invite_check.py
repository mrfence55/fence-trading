"""
Check Telegram bot access and invite-link permissions for Fence channels.

Run:
    python scripts/telegram_invite_check.py
    python scripts/telegram_invite_check.py --generate
"""

import argparse
import asyncio
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

from dotenv import load_dotenv

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
load_dotenv(os.path.join(script_dir, "fenceWeb.env"))

from registration_service import API_HASH, API_ID, BOT_TOKEN, TELEGRAM_GROUPS

try:
    from telethon import TelegramClient, functions
except ImportError as exc:
    raise RuntimeError("Telethon mangler. Kjor: pip install -r scripts/requirements.txt") from exc


async def main() -> None:
    parser = argparse.ArgumentParser(description="Check Telegram channel access")
    parser.add_argument(
        "--generate",
        action="store_true",
        help="Create a one-time invite for each configured channel to verify admin invite rights.",
    )
    parser.add_argument(
        "--print-links",
        action="store_true",
        help="Print generated invite links. Only works together with --generate.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List chats/channels the bot can currently see, then exit.",
    )
    parser.add_argument(
        "--updates",
        action="store_true",
        help="Print recent Bot API updates with chat titles and IDs. Send a test message in each channel first.",
    )
    args = parser.parse_args()

    if not BOT_TOKEN:
        raise RuntimeError("Missing BOT_TOKEN/TELEGRAM_BOT_TOKEN in scripts/fenceWeb.env")

    if not TELEGRAM_GROUPS:
        raise RuntimeError("No Telegram channel IDs configured in scripts/fenceWeb.env")

    if args.updates:
        updates = telegram_bot_api("getUpdates", {})
        if not updates:
            print("No recent updates found. Send a test message in each channel, then run again.")
            return

        seen = set()
        for update in updates:
            message = (
                update.get("channel_post")
                or update.get("message")
                or update.get("edited_channel_post")
                or update.get("edited_message")
            )
            if not message:
                continue

            chat = message.get("chat", {})
            chat_id = chat.get("id")
            title = chat.get("title") or chat.get("username") or chat.get("first_name") or "Unknown"
            if chat_id in seen:
                continue

            seen.add(chat_id)
            print(f"{title}: {chat_id}")
        return

    if args.list:
        if not API_ID or not API_HASH:
            raise RuntimeError("Missing API_ID/API_HASH in scripts/fenceWeb.env")

        client = TelegramClient(os.path.join(script_dir, "telegram_invite_check_session"), API_ID, API_HASH)
        await client.start(bot_token=BOT_TOKEN)

        try:
            dialogs = await client.get_dialogs()
            if not dialogs:
                print("No dialogs found for this bot session.")
            for dialog in dialogs:
                entity = dialog.entity
                title = getattr(entity, "title", getattr(entity, "username", "Unknown"))
                print(f"{title}: {entity.id}")
        finally:
            await client.disconnect()
        return

    for name, chat_id in TELEGRAM_GROUPS.items():
        try:
            if not args.generate:
                chat = telegram_bot_api("getChat", {"chat_id": str(chat_id)})
                title = chat.get("title") or chat.get("username") or str(chat_id)
                print(f"[OK] {name}: bot can access '{title}' ({chat_id})")
                continue

            invite = telegram_bot_api(
                "createChatInviteLink",
                {
                    "chat_id": str(chat_id),
                    "name": f"Fence test - {name}",
                    "member_limit": "1",
                },
            )
            suffix = f" -> {invite['invite_link']}" if args.print_links else ""
            print(f"[OK] {name}: one-time invite created{suffix}")
        except Exception as exc:
            print(f"[FAIL] {name} ({chat_id}): {exc}")


def telegram_bot_api(method: str, params: dict[str, str]) -> dict:
    payload = urllib.parse.urlencode(params).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/{method}",
        data=payload,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode("utf-8"))
        except Exception:
            raise RuntimeError(str(exc)) from exc

    if not body.get("ok"):
        raise RuntimeError(body.get("description", "Unknown Telegram API error"))

    return body["result"]


if __name__ == "__main__":
    asyncio.run(main())
