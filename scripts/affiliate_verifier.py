import os
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import aiosqlite
from playwright.async_api import async_playwright
from telethon import TelegramClient, functions, types
import discord
from dotenv import load_dotenv

# Load environment variables
# Load environment variables
# Try loading from the scripts folder if running from root
load_dotenv(os.path.join(os.path.dirname(__file__), 'fenceWeb.env'))
load_dotenv('fenceWeb.env') # Fallback to current dir

# Configuration
TN_USERNAME = "mr.fence"
TN_PASSWORD = "Spetalen.123"

# Telegram Config (Hardcoded to match working bot)
TELEGRAM_API_ID = 27308955
TELEGRAM_API_HASH = "12c8d6da1b61b738ba1d28b892452783"
TELEGRAM_BOT_TOKEN = "8247162006:AAHPreUcvvHOB9YwoS86tXUAC3U2Rrf8WcI"
TELEGRAM_CHANNEL_ID = -1002083880162

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_VERIFY_CHANNEL_ID = 1442460270285820036

EMAIL_HOST = "smtp-mail.outlook.com"
EMAIL_PORT = 587
EMAIL_USER = "fencetrading@hotmail.com"
EMAIL_PASSWORD = "Spetalen.123"
DB_PATH = "affiliates.db"

# Discord Config
DISCORD_VIP_ROLE_NAME = "verified" # Role to assign upon verification

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
    """
    Fetches pending verification requests from Discord channel.
    Returns a dict: { normalized_name: { 'email': email, 'discord_user_id': user_id (optional) } }
    """
    pending_requests = {}
    
    if not DISCORD_BOT_TOKEN or not DISCORD_VERIFY_CHANNEL_ID:
        logger.warning("Discord configuration missing. Cannot fetch emails.")
        return mapping

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)

    try:
        await client.login(DISCORD_BOT_TOKEN)
        logger.info("Connected to Discord to fetch pending requests...")
        
        # We need to run this in a way that doesn't block the script forever
        # Since client.start() is blocking, we use a custom approach or just fetch via API if possible
        # But discord.py is async. We can use `client.connect()` and then fetch history.
        
        # Simpler approach: Just use the REST API logic or a quick one-off bot task
        # For this script, let's just define a quick on_ready
        
        ready_event = asyncio.Event()
        
        @client.event
        async def on_ready():
            ready_event.set()

        asyncio.create_task(client.connect())
        await asyncio.wait_for(ready_event.wait(), timeout=30)
        
        channel = client.get_channel(DISCORD_VERIFY_CHANNEL_ID)
        if channel:
            # Check last 100 messages
            async for message in channel.history(limit=100):
                if message.embeds:
                    for embed in message.embeds:
                        email = None
                        tn_id = None
                        for field in embed.fields:
                            if field.name == "Email":
                                email = field.value
                            elif field.name == "Trade Nation ID":
                                tn_id = field.value
                        
                        if email:
                            # Use Full Name if available, otherwise try ID (fallback)
                            key = None
                            for field in embed.fields:
                                if field.name == "Full Name":
                                    key = field.value
                            
                            if not key and tn_id:
                                key = tn_id
                                
                            if key:
                                # Webhook requests don't have a direct Discord User ID to DM/Role
                                pending_requests[key.strip().lower()] = {
                                    'email': email,
                                    'discord_user_id': None
                                }

                # Check for User Commands: !verify Name, Country, Email
                if message.content.startswith("!verify"):
                    try:
                        # Expected format: !verify Name, Country, Email
                        content = message.content.replace("!verify", "").strip()
                        parts = [p.strip() for p in content.split(",")]
                        
                        if len(parts) >= 3:
                            name = parts[0]
                            country = parts[1]
                            email = parts[2]
                            
                            pending_requests[name.strip().lower()] = {
                                'email': email,
                                'discord_user_id': message.author.id
                            }
                            logger.info(f"Found command request: {name} from {message.author.name}")
                    except Exception as e:
                        logger.warning(f"Failed to parse command message: {message.content} - {e}")
        
        await client.close()
        
    except Exception as e:
        logger.error(f"Error fetching from Discord: {e}")
        
    return pending_requests

async def get_new_registrations():
    """Scrapes Trade Nation affiliate portal for new registrations."""
    registrations = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            logger.info("Logging into Trade Nation...")
            await page.goto("https://go.tradenation.com/login", timeout=60000)
            await page.fill("input[name='username']", TN_USERNAME)
            await page.fill("input[name='password']", TN_PASSWORD)
            await page.click("button[type='submit']")
            await page.wait_for_url("**/dashboard", timeout=60000)
            
            logger.info("Navigating to Reports...")
            # Robust Navigation: Click menus instead of direct URL
            try:
                # Click "Reports" in sidebar (based on typical sidebar structure)
                # We use text=... to be more resilient to class name changes
                await page.click("text=Reports")
                await page.wait_for_timeout(1000) # Small UI animation wait
                
                # Click "Registrations Report"
                await page.click("text=Registrations Report")
                
                # Wait for the "Run Report" button to be visible to confirm we are there
                await page.wait_for_selector("button:has-text('Run Report')", timeout=60000)
                
                # Click "Run Report" to ensure data loads (defaults usually load, but good to be safe)
                await page.click("button:has-text('Run Report')")
                
            except Exception as nav_error:
                logger.warning(f"Menu navigation failed, trying direct URL fallback: {nav_error}")
                await page.goto("https://go.tradenation.com/partner/reports/registration")

            # Wait for table to load
            logger.info("Waiting for report data...")
            await page.wait_for_selector("table", timeout=60000)
            
            # Take a debug screenshot
            await page.screenshot(path="debug_report_page.png")
            
            # Extract data
            rows = await page.query_selector_all("table tbody tr")
            for row in rows:
                cols = await row.query_selector_all("td")
                if len(cols) >= 4:
                    user_id = await cols[0].inner_text()
                    reg_date = await cols[1].inner_text()
                    country = await cols[2].inner_text()
                    name = await cols[-1].inner_text() 
                    
                    registrations.append({
                        "user_id": user_id.strip(),
                        "name": name.strip(),
                        "country": country.strip(),
                        "date": reg_date.strip()
                    })
                    
        except Exception as e:
            logger.error(f"Error scraping Trade Nation: {e}")
        finally:
            await browser.close()
            
    return registrations

async def generate_telegram_link(client):
    """Generates a one-time use invite link for the VIP channel."""
    try:
        invite = await client(functions.messages.ExportChatInviteRequest(
            peer=TELEGRAM_CHANNEL_ID,
            usage_limit=1,
            expire_date=None,
            title="Fence Trading VIP"
        ))
        return invite.link
    except Exception as e:
        logger.error(f"Error generating Telegram link: {e}")
        return None

def send_welcome_email(to_email, name, telegram_link):
    """Sends the welcome email with the invite link."""
    msg = MIMEMultipart()
    msg['From'] = EMAIL_USER
    msg['To'] = to_email
    msg['Subject'] = "Welcome to Fence Trading VIP! 🎯"

    body = f"""
    Hi {name},

    Congratulations! Your Trade Nation account has been verified.
    
    You now have exclusive access to our VIP signals and community.

    1. **Join the VIP Telegram Channel** (One-time link):
       {telegram_link}
    
    2. **Join our Discord Community**:
       https://discord.gg/YOUR_DISCORD_INVITE_CODE

    3. **Quick Start Guide**:
       - Check the pinned messages in Telegram for the latest strategy.
       - Connect your TradingView account if you haven't already.

    See you on the inside!

    Best regards,
    The Fence Trading Team
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {e}")
        return False

async def send_discord_log(client, message):
    """Sends a log message to the Discord channel."""
    try:
        channel = client.get_channel(DISCORD_VERIFY_CHANNEL_ID)
        if channel:
            await channel.send(message)
    except Exception as e:
        logger.error(f"Failed to send Discord log: {e}")

async def main():
    await init_db()
    
    # 1. Fetch Pending Emails from Discord
    logger.info("Fetching pending verifications from Discord...")
    
    # We need the Discord client for logging and role assignment
    intents = discord.Intents.default()
    intents.message_content = True
    intents.members = True # Needed to assign roles
    discord_client = discord.Client(intents=intents)
    
    pending_requests = {}
    
    try:
        await discord_client.login(DISCORD_BOT_TOKEN)
        asyncio.create_task(discord_client.connect())
        await asyncio.sleep(5) # Wait for connection
        
        # Re-use the logic from get_pending_verifications_from_discord but with the active client
        channel = discord_client.get_channel(DISCORD_VERIFY_CHANNEL_ID)
        if channel:
             async for message in channel.history(limit=100):
                # 1. Webhooks
                if message.embeds:
                    for embed in message.embeds:
                        email = None
                        name = None
                        for field in embed.fields:
                            if field.name == "Email":
                                email = field.value
                            elif field.name == "Full Name":
                                name = field.value
                        
                        if email and name:
                            pending_requests[name.strip().lower()] = {
                                'email': email,
                                'discord_user_id': None
                            }
                
                # 2. User Commands (!verify)
                if message.content.startswith("!verify"):
                    try:
                        content = message.content.replace("!verify", "").strip()
                        parts = [p.strip() for p in content.split(",")]
                        if len(parts) >= 3:
                            name = parts[0]
                            email = parts[2]
                            pending_requests[name.strip().lower()] = {
                                'email': email,
                                'discord_user_id': message.author.id
                            }
                    except: pass

    except Exception as e:
        logger.error(f"Error initializing Discord: {e}")

    logger.info(f"Found {len(pending_requests)} pending requests from Discord.")

    # 2. Start Telegram Client
    client = TelegramClient('affiliate_bot_session', TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.start(bot_token=TELEGRAM_BOT_TOKEN)
    
    if not pending_requests:
        logger.info("No pending verification requests found. Skipping Trade Nation check.")
    else:
        # 3. Get New Registrations from Trade Nation (Only if we have requests)
        registrations = await get_new_registrations()
        logger.info(f"Found {len(registrations)} registrations on Trade Nation.")
        
        async with aiosqlite.connect(DB_PATH) as db:
            for reg in registrations:
            user_id = reg['user_id']
            
            # Check if already processed
            cursor = await db.execute("SELECT 1 FROM affiliates WHERE user_id = ?", (user_id,))
            exists = await cursor.fetchone()
            
            if not exists:
                # Check if we have a request for this Name
                req = pending_requests.get(reg['name'].strip().lower())
                
                if req:
                    email = req['email']
                    discord_user_id = req['discord_user_id']
                    
                    logger.info(f"Processing new verified user: {reg['name']} ({user_id}) -> {email}")
                    
                    # Generate Link
                    link = await generate_telegram_link(client)
                    
                    if link:
                        # 1. Send Email
                        email_sent = send_welcome_email(email, reg['name'], link)
                        
                        # 2. Handle Discord (Role + DM)
                        discord_success_msg = ""
                        if discord_user_id:
                            try:
                                guild = discord_client.get_channel(DISCORD_VERIFY_CHANNEL_ID).guild
                                member = await guild.fetch_member(discord_user_id)
                                
                                # Add Role
                                role = discord.utils.get(guild.roles, name=DISCORD_VIP_ROLE_NAME)
                                if role:
                                    await member.add_roles(role)
                                    discord_success_msg += " | Role Added"
                                else:
                                    logger.warning(f"Role '{DISCORD_VIP_ROLE_NAME}' not found in guild.")

                                # Send DM
                                await member.send(f"🎉 **You are verified!**\n\nHere is your VIP Telegram Link: {link}\n\nWelcome to the team!")
                                discord_success_msg += " | DM Sent"
                            except Exception as e:
                                logger.error(f"Discord Action Failed: {e}")
                                discord_success_msg += f" | Discord Error: {e}"

                        if email_sent:
                            # Save to DB
                            await db.execute(
                                "INSERT INTO affiliates (user_id, name, country, email, registration_date) VALUES (?, ?, ?, ?, ?)",
                                (user_id, reg['name'], reg['country'], email, reg['date'])
                            )
                            await db.commit()
                            logger.info(f"Verified and saved {user_id}")
                            
                            # Log to Discord Channel
                            await send_discord_log(discord_client, f"✅ **Verified User:** {reg['name']}\n📧 Email: {email}\n🌍 Country: {reg['country']}{discord_success_msg}")
                else:
                    logger.debug(f"User {user_id} found on TN but no matching Discord request yet.")

                else:
                    logger.debug(f"User {user_id} already verified.")

    await client.disconnect()
    await discord_client.close()

if __name__ == "__main__":
    asyncio.run(main())
