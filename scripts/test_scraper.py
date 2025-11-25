import os
import asyncio
import logging
from playwright.async_api import async_playwright
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TN_USERNAME = os.getenv("TN_USERNAME")
TN_PASSWORD = os.getenv("TN_PASSWORD")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_scraper():
    if not TN_USERNAME or not TN_PASSWORD:
        logger.error("Missing TN_USERNAME or TN_PASSWORD in .env file")
        return

    async with async_playwright() as p:
        logger.info("Launching browser...")
        browser = await p.chromium.launch(headless=False) # Headless=False to see it working!
        page = await browser.new_page()
        
        try:
            logger.info("Logging into Trade Nation...")
            await page.goto("https://go.tradenation.com/login")
            await page.fill("input[name='username']", TN_USERNAME)
            await page.fill("input[name='password']", TN_PASSWORD)
            await page.click("button[type='submit']")
            
            logger.info("Waiting for dashboard...")
            await page.wait_for_url("**/dashboard", timeout=60000)
            
            logger.info("Navigating to Reports...")
            try:
                await page.click("text=Reports")
                await page.wait_for_timeout(1000)
                await page.click("text=Registrations Report")
                await page.wait_for_selector("button:has-text('Run Report')", timeout=30000)
                await page.click("button:has-text('Run Report')")
            except Exception as e:
                logger.warning(f"Navigation error: {e}")
                await page.goto("https://go.tradenation.com/partner/reports/registration")

            logger.info("Waiting for table data...")
            await page.wait_for_selector("table", timeout=30000)
            
            # Extract and Print Data
            rows = await page.query_selector_all("table tbody tr")
            logger.info(f"Found {len(rows)} rows in the report.")
            
            print("\n" + "="*50)
            print("SCRAPED DATA PREVIEW")
            print("="*50)
            
            for i, row in enumerate(rows):
                cols = await row.query_selector_all("td")
                row_data = [await col.inner_text() for col in cols]
                print(f"Row {i+1}: {row_data}")
                
            print("="*50 + "\n")
            
            await page.screenshot(path="test_scraper_result.png")
            logger.info("Screenshot saved to test_scraper_result.png")
            
        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            await page.screenshot(path="error_screenshot.png")
        finally:
            await asyncio.sleep(5) # Keep open briefly to see
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_scraper())
