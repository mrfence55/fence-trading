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
from discord.ext import commands, tasks
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
BOT_TOKEN   = os.getenv("BOT_TOKEN") # Telegram Bot Token

TELEGRAM_CHANNEL_ID = int(os.getenv("TELEGRAM_CHANNEL_ID"))

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_VERIFY_CHANNEL_ID = int(os.getenv("DISCORD_VERIFY_CHANNEL_ID"))
DISCORD_ROLE_NAME = "verified" 

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

DB_PATH = os.getenv("DB_PATH", "affiliates.db")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("fence_bot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Discord Bot Setup
intents = discord.Intents.default()
intents.message_content = True
intents.members = True # Needed to assign roles
bot = commands.Bot(command_prefix='!', intents=intents)

# Database Setup
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        # Table for verified affiliates
        await db.execute("""
            CREATE TABLE IF NOT EXISTS affiliates (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                country TEXT,
                email TEXT,
                discord_user_id TEXT,
                registration_date TEXT,
                verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table for pending requests (queue)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS pending_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                country TEXT,
                email TEXT,
                discord_user_id TEXT,
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()

# --- Helper Functions ---

async def generate_telegram_link():
    """Generates a one-time use invite link for the VIP channel using Telethon."""
    client = TelegramClient('fence_bot_session', API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    try:
        invite = await client(functions.messages.ExportChatInviteRequest(
            peer=TELEGRAM_CHANNEL_ID,
            usage_limit=1,
            expire_date=None,
            title="Fence Trading VIP"
        ))
        await client.disconnect()
        return invite.link
    except Exception as e:
        logger.error(f"Error generating Telegram link: {e}")
        await client.disconnect()
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
       (You have been assigned the '{DISCORD_ROLE_NAME}' role!)
       
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

async def get_new_registrations():
    """Scrapes Trade Nation affiliate portal for new registrations."""
    registrations = []
    async with async_playwright() as p:
        # Run in HEADLESS mode for production
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            logger.info("Logging into Trade Nation...")
            await page.goto("https://go.tradenation.com/login")
            
            # Wait for page to settle
            try:
                await page.wait_for_load_state("networkidle", timeout=15000)
            except:
                pass 

            # Check for Cookie Banner
            try:
                cookie_btn = page.locator("button:has-text('Accept'), button:has-text('Allow'), button[id*='cookie']")
                if await cookie_btn.count() > 0 and await cookie_btn.first.is_visible():
                    logger.info("Accepting cookies...")
                    await cookie_btn.first.click()
                    await page.wait_for_timeout(1000)
            except:
                pass

            # Wait for ANY input to be visible
            try:
                await page.wait_for_selector("input", state="visible", timeout=60000)
            except:
                logger.error("No input fields found on login page!")

            # Fill credentials
            if await page.locator("input[name='username']").count() > 0:
                await page.fill("input[name='username']", TN_USERNAME)
            else:
                await page.locator("input[type='text'], input[type='email']").first.fill(TN_USERNAME)

            if await page.locator("input[name='password']").count() > 0:
                await page.fill("input[name='password']", TN_PASSWORD)
            else:
                await page.locator("input[type='password']").first.fill(TN_PASSWORD)

            # Click Login Button
            login_btn = page.locator("button[type='submit'], button:has-text('Log in'), button:has-text('Sign in'), button:has-text('Login')")
            if await login_btn.count() > 0:
                await login_btn.first.click()
            else:
                logger.error("Could not find login button!")
                
            # Wait for dashboard
            try:
                await page.wait_for_url("**/partner/**", timeout=60000)
            except:
                pass

            logger.info("Navigating to Reports...")
            try:
                await page.wait_for_selector("text=Reports", timeout=30000)
                await page.click("text=Reports")
                await page.wait_for_timeout(1000) 
                
                await page.wait_for_selector("text=Registrations Report", timeout=10000)
                await page.click("text=Registrations Report")
                await page.wait_for_timeout(2000)
                
                # Set Date Range (Start from 07/11/2025 as requested)
                date_inputs = page.locator(".react-datepicker-wrapper input")
                if await date_inputs.count() > 0:
                    await date_inputs.first.click()
                    await date_inputs.first.press("Meta+a")
                    await date_inputs.first.press("Backspace")
                    await date_inputs.first.fill("07/11/2025")
                    await date_inputs.first.press("Enter")
                    await page.wait_for_timeout(1000)
                else:
                    await page.locator("input[type='text']").nth(0).fill("07/11/2025")

                # Run Report
                run_btn = page.locator("button:has-text('Run Report')")
                await run_btn.wait_for(state="visible", timeout=30000)
                await run_btn.click()
                
            except Exception as nav_error:
                logger.warning(f"Navigation failed: {nav_error}")
                await page.goto("https://go.tradenation.com/partner/reports/registration")
                try:
                    await page.click("button:has-text('Run Report')", timeout=5000)
                except:
                    pass

            # Extract data
            logger.info("Waiting for report data...")
            await page.wait_for_selector("table", timeout=30000)
            
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

# --- Bot Commands & Events ---

@bot.event
async def on_ready():
    logger.info(f'Logged in as {bot.user} (ID: {bot.user.id})')
    await init_db()
    
    # Start the background task
    if not verification_loop.is_running():
        verification_loop.start()
    
    logger.info("Fence Bot is ready and listening!")

@bot.command(name="verify")
async def verify_command(ctx, email: str, country: str, *, full_name: str):
    """
    Usage: !verify email@example.com Country "Full Name"
    Example: !verify oscar@hotmail.com Norway Oscar Gjerde
    """
    logger.info(f"Received manual verification request from {ctx.author}: {full_name}, {country}, {email}")
    
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if already verified
        cursor = await db.execute("SELECT 1 FROM affiliates WHERE discord_user_id = ?", (str(ctx.author.id),))
        if await cursor.fetchone():
            await ctx.send(f"✅ {ctx.author.mention}, you are already verified!")
            return

        # Add to pending queue
        await db.execute(
            "INSERT INTO pending_requests (name, country, email, discord_user_id, source) VALUES (?, ?, ?, ?, ?)",
            (full_name, country, email, str(ctx.author.id), "discord_command")
        )
        await db.commit()
    
    await ctx.send(f"📩 Request received, {ctx.author.mention}! We will check your registration with Trade Nation shortly. You will receive a DM when verified.")

@verify_command.error
async def verify_error(ctx, error):
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("❌ **Incorrect Usage!**\nTry: `!verify <email> <country> <Full Name>`\nExample: `!verify oscar@test.com Norway Oscar Gjerde`")

@bot.event
async def on_message(message):
    # Process commands first
    await bot.process_commands(message)
    
    # Listen for Website Webhooks in the specific channel
    if message.channel.id == DISCORD_VERIFY_CHANNEL_ID and message.author.bot:
        if message.embeds:
            for embed in message.embeds:
                data = {}
                for field in embed.fields:
                    if field.name == "Email":
                        data["email"] = field.value
                    elif field.name == "Full Name":
                        data["name"] = field.value
                    elif field.name == "Country":
                        data["country"] = field.value
                
                if "email" in data and "name" in data:
                    logger.info(f"Received website verification request: {data['name']}")
                    async with aiosqlite.connect(DB_PATH) as db:
                        await db.execute(
                            "INSERT INTO pending_requests (name, country, email, source) VALUES (?, ?, ?, ?)",
                            (data['name'], data.get('country', 'N/A'), data['email'], "website_webhook")
                        )
                        await db.commit()

# --- Background Task ---

@tasks.loop(minutes=30)
async def verification_loop():
    logger.info("Starting verification cycle...")
    
    # 1. Get Pending Requests
    pending = []
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT id, name, country, email, discord_user_id FROM pending_requests") as cursor:
            pending = await cursor.fetchall()
    
    if not pending:
        logger.info("No pending requests. Sleeping.")
        return

    logger.info(f"Processing {len(pending)} pending requests...")

    # 2. Scrape Trade Nation
    try:
        registrations = await get_new_registrations()
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        return

    # 3. Match and Verify
    async with aiosqlite.connect(DB_PATH) as db:
        for req_id, req_name, req_country, req_email, req_discord_id in pending:
            
            match_found = False
            for reg in registrations:
                # Fuzzy/Exact Match Logic
                tn_name = reg['name'].lower().strip()
                req_name_clean = req_name.lower().strip()
                
                if tn_name == req_name_clean:
                    match_found = True
                    tn_id = reg['user_id']
                    
                    # Check if TN ID is already used
                    cursor = await db.execute("SELECT 1 FROM affiliates WHERE user_id = ?", (tn_id,))
                    if await cursor.fetchone():
                        logger.warning(f"TN ID {tn_id} already used. Skipping request {req_id}.")
                        continue
                    
                    logger.info(f"MATCH: {req_name} matched with TN User {tn_id}")
                    
                    # Generate Link
                    link = await generate_telegram_link()
                    
                    if link:
                        # Send Email
                        email_sent = send_welcome_email(req_email, req_name, link)
                        
                        # Assign Discord Role
                        role_assigned = False
                        if req_discord_id:
                            try:
                                guild = bot.get_channel(DISCORD_VERIFY_CHANNEL_ID).guild
                                member = await guild.fetch_member(int(req_discord_id))
                                role = discord.utils.get(guild.roles, name=DISCORD_ROLE_NAME)
                                if role and member:
                                    await member.add_roles(role)
                                    await member.send(f"🎉 You have been verified! Welcome to the VIP team.")
                                    role_assigned = True
                                    logger.info(f"Assigned role {DISCORD_ROLE_NAME} to {member.name}")
                            except Exception as e:
                                logger.error(f"Failed to assign role: {e}")

                        # Save to Affiliates Table
                        await db.execute(
                            "INSERT INTO affiliates (user_id, name, country, email, discord_user_id, registration_date) VALUES (?, ?, ?, ?, ?, ?)",
                            (tn_id, req_name, req_country, req_email, req_discord_id, reg['date'])
                        )
                        
                        # Remove from Pending
                        await db.execute("DELETE FROM pending_requests WHERE id = ?", (req_id,))
                        await db.commit()
                        logger.info(f"Verification complete for {req_name}")
                    break
            
            if not match_found:
                # Optional: Check if request is too old and delete it? 
                # For now, keep it pending until manual cleanup or expiration logic
                pass

@verification_loop.before_loop
async def before_verification_loop():
    await bot.wait_until_ready()

# Run Bot
if __name__ == "__main__":
    bot.run(DISCORD_BOT_TOKEN)
