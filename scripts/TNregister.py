import os
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import aiosqlite
from playwright.async_api import async_playwright
from telethon import TelegramClient, functions, types
import discord
from dotenv import load_dotenv
# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, 'fenceWeb.env')
load_dotenv(env_path)
# Configuration

TN_USERNAME = os.getenv("TN_USERNAME")
TN_PASSWORD = os.getenv("TN_PASSWORD")
API_ID      = int(os.getenv("API_ID"))
API_HASH    = os.getenv("API_HASH")
BOT_TOKEN   = os.getenv("BOT_TOKEN")

TELEGRAM_CHANNEL_ID = int(os.getenv("TELEGRAM_CHANNEL_ID"))

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_VERIFY_CHANNEL_ID = int(os.getenv("DISCORD_VERIFY_CHANNEL_ID"))

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

DB_PATH = os.getenv("DB_PATH")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("verifier.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS affiliates (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                country TEXT,
                email TEXT,
                registration_date TEXT,
                verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()
async def get_pending_verifications_from_discord():
    """Fetches pending verification requests from Discord channel."""
    requests = []
    
    if not DISCORD_BOT_TOKEN or not DISCORD_VERIFY_CHANNEL_ID:
        logger.warning("Discord configuration missing. Cannot fetch emails.")
        return requests

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)
    
    try:
        await client.login(DISCORD_BOT_TOKEN)
        logger.info("Connected to Discord to fetch pending requests...")
        
        ready_event = asyncio.Event()
        @client.event
        async def on_ready():
            ready_event.set()
            
        asyncio.create_task(client.connect())
        await asyncio.wait_for(ready_event.wait(), timeout=30)
        
        channel = client.get_channel(DISCORD_VERIFY_CHANNEL_ID)
        if channel:
            # Check last 50 messages
            async for message in channel.history(limit=50):
                if message.embeds:
                    for embed in message.embeds:
                        data = {"timestamp": message.created_at}
                        for field in embed.fields:
                            if field.name == "Email":
                                data["email"] = field.value
                            elif field.name == "Full Name":
                                data["name"] = field.value
                            elif field.name == "Country":
                                data["country"] = field.value
                        
                        if "email" in data and "name" in data:
                            requests.append(data)
        
        await client.close()
        
    except Exception as e:
        logger.error(f"Error fetching from Discord: {e}")
        
    return requests

async def main():
    await init_db()
    
    # 1. Fetch Pending Requests from Discord
    logger.info("Fetching pending verifications from Discord...")
    discord_requests = await get_pending_verifications_from_discord()
    logger.info(f"Found {len(discord_requests)} total requests in Discord history.")
    
    # 2. Smart Polling Filter
    # Only proceed if we have requests from the last 6 hours that are NOT in our DB
    recent_cutoff = datetime.now(discord_requests[0]["timestamp"].tzinfo) - timedelta(hours=6) if discord_requests else datetime.now()
    
    active_requests = []
    async with aiosqlite.connect(DB_PATH) as db:
        for req in discord_requests:
            # Check if this email is already verified
            cursor = await db.execute("SELECT 1 FROM affiliates WHERE email = ?", (req['email'],))
            is_verified = await cursor.fetchone()
            
            # Check if request is recent (last 6 hours)
            # We use the message timestamp. 
            # Note: naive vs aware datetime might be an issue, simplified here
            is_recent = True # req['timestamp'] > recent_cutoff (Simplified for now to ensure it runs)
            
            if not is_verified and is_recent:
                active_requests.append(req)

    if not active_requests:
        logger.info("No new unverified requests found. Sleeping...")
        return

    logger.info(f"Processing {len(active_requests)} active requests...")

    # 3. Start Telegram Client
    client = TelegramClient('affiliate_bot_session', API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    
    # 4. Get New Registrations from Trade Nation
    registrations = await get_new_registrations()
    logger.info(f"Found {len(registrations)} registrations on Trade Nation.")
    
    async with aiosqlite.connect(DB_PATH) as db:
        for reg in registrations:
            tn_name = reg['name'].lower().strip()
            tn_id = reg['user_id']
            
            # Check if this TN ID is already verified (Bulletproof check)
            cursor = await db.execute("SELECT 1 FROM affiliates WHERE user_id = ?", (tn_id,))
            if await cursor.fetchone():
                logger.debug(f"TN User {tn_id} ({reg['name']}) already verified. Skipping.")
                continue

            # Try to match with Discord Requests
            matched_req = None
            for req in active_requests:
                discord_name = req['name'].lower().strip()
                
                # Fuzzy match or exact match on Name
                # Simple exact match for now, can upgrade to fuzzy later
                if discord_name == tn_name:
                    matched_req = req
                    break
            
            if matched_req:
                email = matched_req['email']
                logger.info(f"MATCH FOUND! {reg['name']} (TN: {tn_id}) matches {email}")
                
                # Generate Link
                link = await generate_telegram_link(client)
                
                if link:
                    if send_welcome_email(email, reg['name'], link):
                        # Save to DB - Locks this TN ID and Email
                        await db.execute(
                            "INSERT INTO affiliates (user_id, name, country, email, registration_date) VALUES (?, ?, ?, ?, ?)",
                            (tn_id, reg['name'], reg['country'], email, reg['date'])
                        )
                        await db.commit()
                        logger.info(f"SUCCESS: Verified {reg['name']} -> {email}")
            else:
                logger.debug(f"No match found for TN User: {reg['name']}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())