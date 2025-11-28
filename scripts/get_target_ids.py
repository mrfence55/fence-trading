from telethon import TelegramClient, events
import asyncio

# Bot Token provided by user
BOT_TOKEN = "8295007846:AAH81E3DRsyR58xxMv6HNiwAeSl9wLtuANM"
API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"

bot = TelegramClient("bot_session", API_ID, API_HASH).start(bot_token=BOT_TOKEN)

@bot.on(events.NewMessage)
async def handler(event):
    chat = await event.get_chat()
    print(f"✅ Message received from:")
    print(f"   Name: {getattr(chat, 'title', 'Unknown')}")
    print(f"   ID:   {chat.id}")
    print("-" * 30)

async def main():
    print("🤖 Bot is listening for messages...")
    print("👉 Please send a message (e.g. 'test') in each of your new channels.")
    print("   I will print the ID here immediately.")
    await bot.run_until_disconnected()

if __name__ == "__main__":
    bot.loop.run_until_complete(main())
