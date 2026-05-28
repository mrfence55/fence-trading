"""
Fence Trading - Unified Registration Service

Handles registrations from Website and Discord, matches with Trade Nation portal,
and sends welcome emails with Telegram/Discord invite links.
"""

import os
import asyncio
import logging
import smtplib
import sqlite3
import re
import unicodedata
import json
import urllib.parse
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from dotenv import load_dotenv

# Telegram imports (for invite link generation)
try:
    from telethon import TelegramClient, functions
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False

# Load environment
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, 'fenceWeb.env')
load_dotenv(env_path)

# Configuration
DB_PATH = (
    os.getenv("REGISTRATION_DB_PATH")
    or os.getenv("DB_PATH")
    or os.path.join(os.path.dirname(script_dir), "affiliates.db")
)
ALLOW_TEST_DUPLICATES = os.getenv("ALLOW_TEST_DUPLICATES", "").lower() == "true"
TEST_DUPLICATE_NAME = os.getenv("TEST_DUPLICATE_NAME", "Oscar Gjerde")

# Email Config
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp-mail.outlook.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "fencetrading@hotmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# Telegram Config
API_ID = int(os.getenv("API_ID") or os.getenv("TELEGRAM_API_ID") or "0")
API_HASH = os.getenv("API_HASH") or os.getenv("TELEGRAM_API_HASH")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("BOT_TOKEN")

# Discord Config
DISCORD_INVITE_LINK = os.getenv("DISCORD_INVITE_LINK", "")

# Telegram fallback links. Use this for a static request-to-join/admin-approval link
# when Telegram cannot generate bot invite links for a specific channel.
TELEGRAM_STATIC_INVITE_URL = os.getenv("TELEGRAM_STATIC_INVITE_URL", "")

def env_int(*names: str, default: int = 0) -> int:
    """Read the first configured integer env var from a list of aliases."""
    for name in names:
        value = os.getenv(name)
        if value:
            try:
                return int(value)
            except ValueError:
                logger.warning("Invalid integer for %s: %s", name, value)
    return default


def configured_telegram_groups() -> Dict[str, int]:
    """Telegram destinations that verified users should receive invite links for."""
    groups = {
        "Fence Trading": env_int("TG_MAIN_GROUP_ID", "TG_FORUM_GROUP_ID", "TG_ALL_CHANNEL_ID", "TELEGRAM_CHANNEL_ID"),
        "Fence - Crypto": env_int("TG_CRYPTO_CHANNEL_ID"),
        "Fence - Aurora": env_int("TG_AURORA_CHANNEL_ID"),
        "Fence - Odin": env_int("TG_ODIN_CHANNEL_ID"),
        "Fence - Live": env_int("TG_LIVE_CHANNEL_ID"),
        "Fence VIP": env_int("TG_VIP_GROUP_ID"),
    }
    return {name: chat_id for name, chat_id in groups.items() if chat_id}


TELEGRAM_GROUPS = configured_telegram_groups()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(script_dir, "registration_service.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("RegistrationService")


@dataclass
class PendingRegistration:
    """Represents a pending registration request."""
    id: int
    name: str
    country: str
    email: str
    discord_user_id: Optional[str]
    discord_username: Optional[str]
    telegram_username: Optional[str]
    source: str  # 'website' or 'discord'
    status: str  # 'pending', 'verified', 'rejected'
    created_at: datetime


@dataclass
class VerifiedAffiliate:
    """Represents a verified affiliate."""
    user_id: str  # Trade Nation ID
    name: str
    country: str
    email: str
    discord_user_id: Optional[str]
    registration_date: str
    verified_at: datetime


class RegistrationService:
    """
    Unified service for handling registrations from Website and Discord.
    
    Flow:
    1. User registers via Website or Discord
    2. Registration stored in pending_requests table
    3. Trade Nation scraper runs periodically
    4. When match found, user is verified and welcome email sent
    """
    
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._ensure_tables()
        logger.info(f"RegistrationService initialized with DB: {db_path}")
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _ensure_tables(self):
        """Ensure required tables exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Pending requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pending_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    country TEXT,
                    email TEXT NOT NULL,
                    discord_user_id TEXT,
                    source TEXT DEFAULT 'website',
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Affiliates table (verified users)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS affiliates (
                    user_id TEXT PRIMARY KEY,
                    name TEXT,
                    country TEXT,
                    email TEXT,
                    discord_user_id TEXT,
                    telegram_links_sent TEXT,
                    registration_date TEXT,
                    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Migration: Add missing columns to existing tables
            # This handles databases created before these columns were added
            try:
                cursor.execute("ALTER TABLE affiliates ADD COLUMN discord_user_id TEXT")
                logger.info("Added discord_user_id column to affiliates")
            except:
                pass  # Column already exists
            
            try:
                cursor.execute("ALTER TABLE affiliates ADD COLUMN telegram_links_sent TEXT")
                logger.info("Added telegram_links_sent column to affiliates")
            except:
                pass  # Column already exists
            
            try:
                cursor.execute("ALTER TABLE pending_requests ADD COLUMN discord_user_id TEXT")
                logger.info("Added discord_user_id column to pending_requests")
            except:
                pass  # Column already exists

            try:
                cursor.execute("ALTER TABLE pending_requests ADD COLUMN discord_username TEXT")
                logger.info("Added discord_username column to pending_requests")
            except:
                pass

            try:
                cursor.execute("ALTER TABLE pending_requests ADD COLUMN telegram_username TEXT")
                logger.info("Added telegram_username column to pending_requests")
            except:
                pass

            try:
                cursor.execute("ALTER TABLE pending_requests ADD COLUMN updated_at TIMESTAMP")
                logger.info("Added updated_at column to pending_requests")
            except:
                pass
            
            conn.commit()
            logger.info("Database tables ensured")
    
    # ==================== REGISTRATION ====================
    
    def add_pending_registration(
        self, 
        name: str, 
        email: str, 
        country: str = "", 
        source: str = "website",
        discord_user_id: Optional[str] = None
    ) -> int:
        """
        Add a new pending registration.
        
        Args:
            name: Full name (as registered on Trade Nation)
            email: Email address for sending invite links
            country: Country of residence (helps with matching)
            source: 'website' or 'discord'
            discord_user_id: Discord user ID (for role assignment)
            
        Returns:
            ID of the created pending request
        """
        # Check if already registered or pending
        if (
            not should_bypass_duplicate_checks(name)
            and self._is_already_registered(
            email,
            name=name,
            country=country,
            discord_user_id=discord_user_id
            )
        ):
            logger.warning(f"Email {email} already registered/pending")
            return -1
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO pending_requests (name, country, email, source, discord_user_id, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            """, (name.strip(), country.strip(), email.strip().lower(), source, discord_user_id))
            conn.commit()
            
            request_id = cursor.lastrowid
            logger.info(f"Added pending registration #{request_id}: {name} <{email}> via {source}")
            return request_id
    
    def _is_already_registered(
        self,
        email: str,
        name: str = "",
        country: str = "",
        discord_user_id: Optional[str] = None
    ) -> bool:
        """Check if email is already registered or has a pending request."""
        email = email.strip().lower()
        normalized_name = normalize_name(name)
        normalized_country = normalize_name(country)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check affiliates table
            cursor.execute("SELECT 1 FROM affiliates WHERE LOWER(email) = ?", (email,))
            if cursor.fetchone():
                return True

            if discord_user_id:
                cursor.execute(
                    "SELECT 1 FROM affiliates WHERE discord_user_id = ?",
                    (str(discord_user_id),)
                )
                if cursor.fetchone():
                    return True
            
            # Check pending_requests (only 'pending' status)
            cursor.execute(
                "SELECT 1 FROM pending_requests WHERE LOWER(email) = ? AND status = 'pending'",
                (email,)
            )
            if cursor.fetchone():
                return True

            if discord_user_id:
                cursor.execute(
                    "SELECT 1 FROM pending_requests WHERE discord_user_id = ? AND status = 'pending'",
                    (str(discord_user_id),)
                )
                if cursor.fetchone():
                    return True

            if normalized_name:
                cursor.execute(
                    "SELECT name, country FROM pending_requests WHERE status = 'pending'"
                )
                for row in cursor.fetchall():
                    if (
                        normalize_name(row["name"]) == normalized_name
                        and normalize_name(row["country"]) == normalized_country
                    ):
                        return True

                cursor.execute("SELECT name, country FROM affiliates")
                for row in cursor.fetchall():
                    if (
                        normalize_name(row["name"]) == normalized_name
                        and normalize_name(row["country"]) == normalized_country
                    ):
                        return True
            
            return False
    
    def get_pending_registrations(self) -> List[PendingRegistration]:
        """Get all pending registrations."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM pending_requests WHERE status = 'pending'
                ORDER BY created_at DESC
            """)
            rows = cursor.fetchall()
            
            return [
                PendingRegistration(
                    id=row['id'],
                    name=row['name'],
                    country=row['country'] or "",
                    email=row['email'],
                    discord_user_id=row['discord_user_id'],
                    discord_username=row['discord_username'] if 'discord_username' in row.keys() else None,
                    telegram_username=row['telegram_username'] if 'telegram_username' in row.keys() else None,
                    source=row['source'],
                    status=row['status'],
                    created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else datetime.now()
                )
                for row in rows
            ]
    
    # ==================== VERIFICATION ====================
    
    def verify_registration(
        self,
        pending_id: int,
        tn_user_id: str,
        tn_name: str,
        tn_country: str,
        tn_reg_date: str
    ) -> bool:
        """
        Verify a pending registration by matching with Trade Nation data.
        
        Args:
            pending_id: ID from pending_requests table
            tn_user_id: Trade Nation user ID
            tn_name: Name from Trade Nation
            tn_country: Country from Trade Nation
            tn_reg_date: Registration date from Trade Nation
            
        Returns:
            True if verification successful
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Get pending request
            cursor.execute("SELECT * FROM pending_requests WHERE id = ?", (pending_id,))
            pending = cursor.fetchone()
            
            if not pending:
                logger.error(f"Pending request #{pending_id} not found")
                return False
            
            if pending['status'] != 'pending':
                logger.warning(f"Pending request #{pending_id} already processed: {pending['status']}")
                return False
            
            # Check if TN user already verified
            cursor.execute("SELECT 1 FROM affiliates WHERE user_id = ?", (tn_user_id,))
            if cursor.fetchone():
                logger.warning(f"TN user {tn_user_id} already verified")
                cursor.execute(
                    "UPDATE pending_requests SET status = 'duplicate', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (pending_id,)
                )
                conn.commit()
                return False
            
            # Move to affiliates table
            cursor.execute("""
                INSERT INTO affiliates (user_id, name, country, email, discord_user_id, registration_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                tn_user_id,
                tn_name,
                tn_country,
                pending['email'],
                pending['discord_user_id'],
                tn_reg_date
            ))
            
            # Update pending status
            cursor.execute(
                "UPDATE pending_requests SET status = 'verified', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (pending_id,)
            )
            
            conn.commit()
            logger.info(f"Verified: {pending['name']} -> TN:{tn_user_id}")
            return True
    
    def get_affiliate_by_email(self, email: str) -> Optional[Dict]:
        """Get verified affiliate by email."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM affiliates WHERE LOWER(email) = ?",
                (email.strip().lower(),)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    # ==================== EMAIL ====================
    
    def send_welcome_email(
        self,
        to_email: str,
        name: str,
        telegram_links: Dict[str, str],
        discord_link: str = DISCORD_INVITE_LINK
    ) -> bool:
        """
        Send welcome email with Telegram and Discord invite links.
        
        Args:
            to_email: Recipient email
            name: User's name
            telegram_links: Dict of group_name -> invite_link
            discord_link: Discord server invite link
            
        Returns:
            True if email sent successfully
        """
        if not EMAIL_PASSWORD:
            logger.error("EMAIL_PASSWORD not configured")
            return False
        
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = "🎯 Welcome to Fence Trading VIP!"
        
        # Build Telegram links section
        tg_links_text = ""
        tg_links_html = ""
        for group_name, link in telegram_links.items():
            display_name = group_name.replace("_", " ").title()
            tg_links_text += f"• {display_name}: {link}\n"
            tg_links_html += f'<li><a href="{link}">{display_name}</a></li>'
        
        # Plain text version
        text_body = f"""
Hi {name},

Congratulations! Your Trade Nation account has been verified. 🎉

You now have exclusive access to our VIP signals and community.

📱 JOIN TELEGRAM GROUPS:
{tg_links_text}
💬 JOIN DISCORD COMMUNITY:
{discord_link}

Quick Start Guide:
1. Check pinned messages in Telegram for the latest strategy
2. Complete quests in Discord to win giveaways!
3. Connect your TradingView account if you haven't already

Welcome to our 1000+ strong community!

Best regards,
The Fence Trading Team

---
Trading involves risk. Please trade responsibly.
        """
        
        # HTML version
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .section {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }}
        .btn {{ display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }}
        .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
        ul {{ padding-left: 20px; }}
        li {{ margin: 8px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Welcome to Fence Trading VIP!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            <p>Congratulations! Your Trade Nation account has been verified. 🎉</p>
            
            <div class="section">
                <h3>📱 Join Telegram Groups</h3>
                <ul>{tg_links_html}</ul>
            </div>
            
            <div class="section">
                <h3>💬 Join Discord Community</h3>
                <p><a href="{discord_link}" class="btn">Join Discord</a></p>
            </div>
            
            <div class="section">
                <h3>🚀 Quick Start Guide</h3>
                <ol>
                    <li>Check pinned messages in Telegram for the latest strategy</li>
                    <li>Complete quests in Discord to win giveaways!</li>
                    <li>Connect your TradingView account if you haven't already</li>
                </ol>
            </div>
            
            <p>Welcome to our <strong>1000+ strong community!</strong></p>
            
            <p>Best regards,<br><strong>The Fence Trading Team</strong></p>
        </div>
        <div class="footer">
            <p>Trading involves risk. Please trade responsibly.</p>
        </div>
    </div>
</body>
</html>
        """
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        try:
            # Use SMTP_SSL for port 465, SMTP with starttls for port 587
            if EMAIL_PORT == 465:
                server = smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT)
            else:
                server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
                server.starttls()
            
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
            server.quit()
            logger.info(f"Welcome email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    # ==================== TELEGRAM ====================

    async def create_bot_api_invite_link(
        self,
        chat_id: int,
        name: str,
        member_limit: int = 1
    ) -> str:
        """Create a Telegram invite link through Bot API using chat_id directly."""
        if not BOT_TOKEN:
            raise RuntimeError("TELEGRAM_BOT_TOKEN/BOT_TOKEN is not configured")

        def request_link() -> str:
            payload = urllib.parse.urlencode({
                "chat_id": str(chat_id),
                "name": f"Fence VIP - {name}",
                "member_limit": str(member_limit),
            }).encode("utf-8")

            request = urllib.request.Request(
                f"https://api.telegram.org/bot{BOT_TOKEN}/createChatInviteLink",
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
                description = body.get("description", "Unknown Telegram API error")
                raise RuntimeError(description)

            return body["result"]["invite_link"]

        return await asyncio.to_thread(request_link)
    
    async def generate_telegram_invite_links(
        self,
        client: 'TelegramClient',
        groups: Dict[str, int] = TELEGRAM_GROUPS
    ) -> Dict[str, str]:
        """
        Generate one-time invite links for all configured Telegram groups.
        
        Args:
            client: Authenticated Telethon client
            groups: Dict of group_name -> group_id
            
        Returns:
            Dict of group_name -> invite_link
        """
        links = {}
        if TELEGRAM_STATIC_INVITE_URL:
            links["Fence Trading"] = TELEGRAM_STATIC_INVITE_URL

        for name, group_id in groups.items():
            if group_id == 0:
                continue
            if name in links:
                continue
            try:
                links[name] = await self.create_bot_api_invite_link(group_id, name)
                logger.info(f"Generated Bot API invite link for {name}")
                continue
            except Exception as e:
                logger.warning(f"Bot API invite failed for {name} ({group_id}): {e}")

            if not TELETHON_AVAILABLE or not client:
                continue

            try:
                invite = await client(functions.messages.ExportChatInviteRequest(
                    peer=group_id,
                    usage_limit=1,  # One-time use
                    expire_date=None,
                    title=f"Fence VIP - {name}"
                ))
                links[name] = invite.link
                logger.info(f"Generated invite link for {name}: {invite.link}")
            except Exception as e:
                logger.error(f"Failed to generate link for {name} ({group_id}): {e}")
        
        return links
    
    # ==================== MATCHING ====================
    
    def match_name(self, pending_name: str, tn_name: str) -> bool:
        """
        Check if names match (case-insensitive, handles common variations).
        
        Args:
            pending_name: Name from pending registration
            tn_name: Name from Trade Nation
            
        Returns:
            True if names match
        """
        # Normalize names
        p_name = pending_name.lower().strip()
        t_name = tn_name.lower().strip()
        
        # Debug log
        logger.debug(f"Comparing: pending='{p_name}' vs tn='{t_name}'")
        
        # Exact match
        if p_name == t_name:
            logger.info(f"EXACT MATCH: '{p_name}' == '{t_name}'")
            return True
        
        # Handle "First Last" vs "Last, First"
        p_parts = set(p_name.replace(",", "").split())
        t_parts = set(t_name.replace(",", "").split())
        
        logger.debug(f"Parts: pending={p_parts} vs tn={t_parts}")
        
        if p_parts == t_parts:
            logger.info(f"PARTS MATCH: {p_parts}")
            return True
        
        # Check if one is substring of other (handles middle names)
        if len(p_parts) >= 2 and len(t_parts) >= 2:
            # Check first and last name match
            p_first = min(p_parts, key=lambda x: p_name.find(x))
            p_last = max(p_parts, key=lambda x: p_name.find(x))
            
            if p_first in t_parts and p_last in t_parts:
                logger.info(f"PARTIAL MATCH: first='{p_first}' last='{p_last}'")
                return True
        
        logger.debug(f"NO MATCH: '{pending_name}' vs '{tn_name}'")
        return False
    
    def find_matching_pending(
        self,
        tn_name: str,
        tn_country: str = ""
    ) -> Optional[PendingRegistration]:
        """
        Find a matching pending registration for a Trade Nation user.
        
        Args:
            tn_name: Name from Trade Nation
            tn_country: Country from Trade Nation (optional, for logging only)
            
        Returns:
            Matching PendingRegistration or None
        """
        pending_list = self.get_pending_registrations()
        
        for pending in pending_list:
            logger.info(f"Checking: pending='{pending.name}' ({pending.country or 'no country'}) vs TN='{tn_name}' ({tn_country})")
            
            if self.match_name(pending.name, tn_name):
                # Name matches - this is sufficient for verification
                # Country is logged but not required to match
                if tn_country and pending.country:
                    if pending.country.lower().strip() != tn_country.lower().strip():
                        logger.info(f"Note: Country differs ({pending.country} vs {tn_country}) but name matched, proceeding anyway")
                
                logger.info(f"MATCH FOUND: {pending.name} -> {tn_name}")
                return pending
        
        logger.info(f"No match found for TN name: {tn_name}")
        return None


def normalize_name(value: Optional[str]) -> str:
    """Normalize names/countries for duplicate checks."""
    raw = unicodedata.normalize("NFKC", value or "").strip().lower()
    raw = re.sub(r"[^\w\s]", " ", raw, flags=re.UNICODE)
    return re.sub(r"\s+", " ", raw).strip()


def should_bypass_duplicate_checks(name: str) -> bool:
    """Allow repeated local test registrations for one configured name."""
    return ALLOW_TEST_DUPLICATES and normalize_name(name) == normalize_name(TEST_DUPLICATE_NAME)


# ==================== STANDALONE USAGE ====================

if __name__ == "__main__":
    # Quick test
    service = RegistrationService()
    
    # Example: Add a test registration
    # request_id = service.add_pending_registration(
    #     name="Test User",
    #     email="test@example.com",
    #     country="Norway",
    #     source="website"
    # )
    # print(f"Created request: {request_id}")
    
    # List pending
    pending = service.get_pending_registrations()
    print(f"Pending registrations: {len(pending)}")
    for p in pending:
        print(f"  #{p.id}: {p.name} <{p.email}> via {p.source}")
