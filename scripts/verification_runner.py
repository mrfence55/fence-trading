"""
Fence Trading - Automated Verification Runner

Runs continuously to:
1. Check for pending registrations (from website/Discord)
2. Scrape Trade Nation portal for new signups
3. Match registrations and verify users
4. Send welcome emails with Telegram invite links

Run with: python verification_runner.py
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv

# Add scripts directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

# Load environment
env_path = os.path.join(script_dir, 'fenceWeb.env')
load_dotenv(env_path)

# Local imports
from registration_service import RegistrationService, TELEGRAM_GROUPS

# Playwright for web scraping
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not installed. Run: pip install playwright && playwright install")

# Telethon for Telegram
try:
    from telethon import TelegramClient
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False
    print("Warning: Telethon not installed. Run: pip install telethon")

# Configuration
TN_USERNAME = os.getenv("TN_USERNAME", "mr.fence")
TN_PASSWORD = os.getenv("TN_PASSWORD")

API_ID = int(os.getenv("API_ID", "27308955"))
API_HASH = os.getenv("API_HASH", "12c8d6da1b61b738ba1d28b892452783")
BOT_TOKEN = os.getenv("BOT_TOKEN")

CHECK_INTERVAL = int(os.getenv("VERIFICATION_CHECK_INTERVAL", "3600"))  # 60 minutes default

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(script_dir, "verification_runner.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("VerificationRunner")


async def scrape_trade_nation_registrations() -> list[dict]:
    """
    Scrape Trade Nation affiliate portal for new registrations.
    
    Returns:
        List of dicts with: user_id, name, country, date
    """
    if not PLAYWRIGHT_AVAILABLE:
        logger.error("Playwright not available")
        return []
    
    if not TN_PASSWORD:
        logger.error("TN_PASSWORD not set")
        return []
    
    registrations = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            logger.info("Logging into Trade Nation portal...")
            await page.goto("https://go.tradenation.com/login", timeout=120000)
            
            # Wait for form to load
            await page.wait_for_selector("input[name='user']", timeout=120000)
            
            await page.fill("input[name='user']", TN_USERNAME)
            await page.fill("input[name='password']", TN_PASSWORD)
            await page.click("button.submit-btn")
            
            # Wait for redirect to partner dashboard
            await page.wait_for_url("**/partner/**", timeout=120000)
            logger.info("Login successful")
            
            # Navigate to Registrations Report
            logger.info("Navigating to Registrations Report...")
            await page.goto("https://go.tradenation.com/partner/reports/registration", timeout=120000)
            
            # Wait for page to load
            await page.wait_for_timeout(3000)
            
            # Select Custom date range
            logger.info("Setting Custom date range...")
            try:
                # Click on the date range dropdown (shows "Month to Date" or similar)
                dropdown = await page.query_selector("text=Month to Date")
                if not dropdown:
                    dropdown = await page.query_selector("text=Custom")
                if dropdown:
                    await dropdown.click()
                    await page.wait_for_timeout(1000)
                    
                    # Click on "Custom" option
                    custom_option = await page.query_selector("text=Custom")
                    if custom_option:
                        await custom_option.click()
                        await page.wait_for_timeout(1000)
            except Exception as e:
                logger.warning(f"Could not set dropdown: {e}")
            
            # Set start date to 01/01/2022 for full history
            logger.info("Setting start date to 01/01/2022...")
            try:
                # Find start date input and clear/fill it
                date_inputs = await page.query_selector_all("input[type='text']")
                if len(date_inputs) >= 1:
                    start_input = date_inputs[0]
                    await start_input.click()
                    await page.wait_for_timeout(500)
                    # Clear and type new date
                    await start_input.fill("01/01/2022")
                    await page.keyboard.press("Escape")
                    await page.wait_for_timeout(500)
            except Exception as e:
                logger.warning(f"Could not set start date: {e}")
            
            # Click Run Report button
            logger.info("Clicking Run Report...")
            try:
                run_btn = await page.wait_for_selector("button:has-text('Run Report')", timeout=10000)
                if run_btn:
                    await run_btn.click()
                    logger.info("Waiting for report to load...")
                    await page.wait_for_timeout(10000)  # Give time for report to generate
            except Exception as e:
                logger.warning(f"Could not click Run Report: {e}")
            
            # Take screenshot to debug
            await page.screenshot(path=os.path.join(script_dir, "tn_after_run_report.png"))
            
            # Wait for table data to appear
            logger.info("Waiting for table data...")
            try:
                await page.wait_for_selector("table tbody tr", timeout=60000)
            except:
                logger.warning("Table not found with tbody tr, trying alternative...")
                # Try scrolling in case data is lazy loaded
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await page.wait_for_timeout(3000)
            
            # Take debug screenshot
            await page.screenshot(path=os.path.join(script_dir, "tn_report_page.png"))
            
            # Extract data from table
            rows = await page.query_selector_all("table tbody tr")
            if not rows:
                # Try alternative selector
                rows = await page.query_selector_all("tr")
            
            logger.info(f"Found {len(rows)} rows in report")
            
            for row in rows:
                cols = await row.query_selector_all("td")
                if len(cols) >= 4:
                    user_id = await cols[0].inner_text()
                    reg_date = await cols[1].inner_text()
                    country = await cols[2].inner_text()
                    name = await cols[-1].inner_text()  # Last column is customer name
                    
                    # Skip header rows
                    if "User ID" in user_id or not user_id.strip():
                        continue
                    
                    registrations.append({
                        "user_id": user_id.strip(),
                        "name": name.strip(),
                        "country": country.strip(),
                        "date": reg_date.strip()
                    })
            
            logger.info(f"Scraped {len(registrations)} registrations from Trade Nation")
            
        except Exception as e:
            logger.error(f"Error scraping Trade Nation: {e}")
            try:
                await page.screenshot(path=os.path.join(script_dir, "tn_error.png"))
            except:
                pass
        finally:
            await browser.close()
    
    return registrations


async def run_verification_cycle(
    service: RegistrationService,
    telegram_client: 'TelegramClient'
):
    """
    Run one verification cycle.
    
    1. Get pending registrations
    2. Scrape Trade Nation
    3. Match and verify
    4. Send welcome emails
    """
    logger.info("=== Starting Verification Cycle ===")
    
    # 1. Get pending registrations
    pending = service.get_pending_registrations()
    logger.info(f"Found {len(pending)} pending registrations")
    
    if not pending:
        logger.info("No pending registrations. Skipping Trade Nation check.")
        return
    
    # 2. Scrape Trade Nation
    tn_registrations = await scrape_trade_nation_registrations()
    logger.info(f"Found {len(tn_registrations)} Trade Nation registrations")
    
    if not tn_registrations:
        logger.warning("No Trade Nation registrations found")
        return
    
    # 3. Match and verify
    verified_count = 0
    
    for tn_reg in tn_registrations:
        tn_name = tn_reg['name']
        tn_country = tn_reg['country']
        tn_user_id = tn_reg['user_id']
        tn_date = tn_reg['date']
        
        # Find matching pending registration
        match = service.find_matching_pending(tn_name, tn_country)
        
        if match:
            logger.info(f"MATCH FOUND: {match.name} -> Trade Nation {tn_user_id}")
            
            # Verify the registration
            success = service.verify_registration(
                pending_id=match.id,
                tn_user_id=tn_user_id,
                tn_name=tn_name,
                tn_country=tn_country,
                tn_reg_date=tn_date
            )
            
            if success:
                # Generate Telegram invite links
                telegram_links = {}
                if TELETHON_AVAILABLE and telegram_client:
                    telegram_links = await service.generate_telegram_invite_links(
                        telegram_client,
                        TELEGRAM_GROUPS
                    )
                
                # Send welcome email
                if telegram_links:
                    email_sent = service.send_welcome_email(
                        to_email=match.email,
                        name=match.name,
                        telegram_links=telegram_links
                    )
                    
                    if email_sent:
                        verified_count += 1
                        logger.info(f"✅ Verified and emailed: {match.name} <{match.email}>")
                    else:
                        logger.error(f"Failed to send email to {match.email}")
                else:
                    logger.warning(f"No Telegram links generated for {match.name}")
    
    logger.info(f"=== Verification Cycle Complete: {verified_count} users verified ===")


async def main():
    """Main entry point - runs verification loop."""
    logger.info("Starting Verification Runner...")
    logger.info(f"Check interval: {CHECK_INTERVAL} seconds ({CHECK_INTERVAL // 60} minutes)")
    
    # Initialize service
    service = RegistrationService()
    
    # Initialize Telegram client if available
    telegram_client = None
    if TELETHON_AVAILABLE and BOT_TOKEN:
        telegram_client = TelegramClient(
            os.path.join(script_dir, 'verification_session'),
            API_ID,
            API_HASH
        )
        await telegram_client.start(bot_token=BOT_TOKEN)
        logger.info("Telegram client connected")
    else:
        logger.warning("Telegram client not available - links won't be generated")
    
    try:
        while True:
            try:
                await run_verification_cycle(service, telegram_client)
            except Exception as e:
                logger.error(f"Error in verification cycle: {e}")
            
            logger.info(f"Sleeping for {CHECK_INTERVAL // 60} minutes...")
            await asyncio.sleep(CHECK_INTERVAL)
            
    except KeyboardInterrupt:
        logger.info("Stopping verification runner...")
    finally:
        if telegram_client:
            await telegram_client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
