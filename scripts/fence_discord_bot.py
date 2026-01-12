"""
Fence Trading - Discord Registration Bot

A persistent Discord bot that allows users to register for affiliate verification
directly from Discord using !register or /register commands.

Run with: python fence_discord_bot.py
"""

import os
import asyncio
import logging
import sqlite3
import re
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

import discord
from discord import app_commands
from discord.ext import commands

# Load environment
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, 'fenceWeb.env')
load_dotenv(env_path)

# Configuration
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_VERIFY_CHANNEL_ID = int(os.getenv("DISCORD_VERIFY_CHANNEL_ID", "0"))
DISCORD_LOG_CHANNEL_ID = int(os.getenv("DISCORD_LOG_CHANNEL_ID", "0")) or DISCORD_VERIFY_CHANNEL_ID

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(script_dir), "affiliates.db"))

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(script_dir, "discord_bot.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("FenceDiscordBot")


class RegistrationDatabase:
    """Database handler for registrations."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pending_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                country TEXT,
                email TEXT NOT NULL,
                discord_user_id TEXT,
                source TEXT DEFAULT 'discord',
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
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
        
        conn.commit()
        conn.close()
    
    def add_registration(
        self,
        name: str,
        email: str,
        country: str,
        discord_user_id: str
    ) -> tuple[bool, str]:
        """
        Add a new pending registration.
        
        Returns:
            (success, message)
        """
        email = email.strip().lower()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if already pending
            cursor.execute(
                "SELECT 1 FROM pending_requests WHERE LOWER(email) = ? AND status = 'pending'",
                (email,)
            )
            if cursor.fetchone():
                return False, "This email already has a pending registration!"
            
            # Check if already verified
            cursor.execute(
                "SELECT 1 FROM affiliates WHERE LOWER(email) = ?",
                (email,)
            )
            if cursor.fetchone():
                return False, "This email is already verified!"
            
            # Insert new registration
            cursor.execute("""
                INSERT INTO pending_requests (name, country, email, discord_user_id, source, status)
                VALUES (?, ?, ?, ?, 'discord', 'pending')
            """, (name.strip(), country.strip(), email, str(discord_user_id)))
            
            conn.commit()
            request_id = cursor.lastrowid
            
            logger.info(f"New registration #{request_id}: {name} <{email}> from Discord user {discord_user_id}")
            return True, f"Registration submitted! Your request ID is #{request_id}"
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            return False, "Database error - please try again later."
        finally:
            conn.close()
    
    def check_status(self, email: str) -> Optional[str]:
        """Check registration status by email."""
        email = email.strip().lower()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check affiliates first
            cursor.execute(
                "SELECT verified_at FROM affiliates WHERE LOWER(email) = ?",
                (email,)
            )
            row = cursor.fetchone()
            if row:
                return f"✅ **Verified** on {row[0][:10] if row[0] else 'unknown date'}"
            
            # Check pending
            cursor.execute(
                "SELECT status, created_at FROM pending_requests WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1",
                (email,)
            )
            row = cursor.fetchone()
            if row:
                status, created = row
                if status == 'pending':
                    return f"⏳ **Pending** - Submitted on {created[:10] if created else 'unknown date'}"
                elif status == 'rejected':
                    return "❌ **Rejected** - Please contact support"
                else:
                    return f"Status: {status}"
            
            return None
            
        finally:
            conn.close()


class FenceBot(commands.Bot):
    """Custom bot class with registration functionality."""
    
    def __init__(self, db: RegistrationDatabase):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        
        super().__init__(
            command_prefix="!",
            intents=intents,
            help_command=None
        )
        
        self.db = db
    
    async def setup_hook(self):
        """Called when the bot is ready to sync commands."""
        # Add slash commands
        self.tree.add_command(RegisterCommand(self.db))
        self.tree.add_command(StatusCommand(self.db))
        
        # Sync commands with Discord
        try:
            synced = await self.tree.sync()
            logger.info(f"Synced {len(synced)} slash commands")
        except Exception as e:
            logger.error(f"Failed to sync commands: {e}")
    
    async def on_ready(self):
        """Called when the bot is online."""
        logger.info(f"Bot is online as {self.user}")
        logger.info(f"Connected to {len(self.guilds)} servers")
        
        # Set status
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="for !register commands"
            )
        )


# ==================== TEXT COMMANDS ====================

@commands.command(name="register")
async def register_command(ctx: commands.Context, *, details: str = ""):
    """
    Register for affiliate verification.
    Usage: !register Full Name, Country, email@example.com
    """
    if not details:
        embed = discord.Embed(
            title="📝 How to Register",
            description="Submit your Trade Nation registration details for verification.",
            color=0x06b6d4
        )
        embed.add_field(
            name="Usage",
            value="```!register Your Full Name, Country, your@email.com```",
            inline=False
        )
        embed.add_field(
            name="Example",
            value="```!register John Doe, Norway, john.doe@gmail.com```",
            inline=False
        )
        embed.set_footer(text="Make sure to use the SAME name as your Trade Nation account!")
        await ctx.reply(embed=embed)
        return
    
    # Parse: Name, Country, Email
    parts = [p.strip() for p in details.split(",")]
    
    if len(parts) < 3:
        await ctx.reply(
            "❌ Invalid format! Please use: `!register Full Name, Country, email@example.com`"
        )
        return
    
    name = parts[0]
    country = parts[1]
    email = parts[2]
    
    # Validate email
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        await ctx.reply("❌ Invalid email format! Please provide a valid email address.")
        return
    
    # Validate name
    if len(name) < 2:
        await ctx.reply("❌ Please provide your full name!")
        return
    
    # Add to database
    db: RegistrationDatabase = ctx.bot.db
    success, message = db.add_registration(
        name=name,
        email=email,
        country=country,
        discord_user_id=ctx.author.id
    )
    
    if success:
        embed = discord.Embed(
            title="✅ Registration Submitted!",
            description="Your details have been received.",
            color=0x10b981
        )
        embed.add_field(name="Name", value=name, inline=True)
        embed.add_field(name="Country", value=country, inline=True)
        embed.add_field(name="Email", value=f"||{email}||", inline=False)
        embed.add_field(
            name="Next Steps",
            value="We will verify your Trade Nation registration and send you an email with your Telegram invite links!",
            inline=False
        )
        embed.set_footer(text=message)
        await ctx.reply(embed=embed)
        
        # Log to admin channel
        log_channel = ctx.bot.get_channel(DISCORD_LOG_CHANNEL_ID)
        if log_channel:
            log_embed = discord.Embed(
                title="📝 New Registration (Discord)",
                color=0x06b6d4,
                timestamp=datetime.now()
            )
            log_embed.add_field(name="Name", value=name, inline=True)
            log_embed.add_field(name="Country", value=country, inline=True)
            log_embed.add_field(name="Email", value=email, inline=False)
            log_embed.add_field(name="Discord User", value=f"{ctx.author} ({ctx.author.id})", inline=False)
            await log_channel.send(embed=log_embed)
    else:
        await ctx.reply(f"❌ {message}")


@commands.command(name="status")
async def status_command(ctx: commands.Context, email: str = ""):
    """
    Check your registration status.
    Usage: !status your@email.com
    """
    if not email:
        await ctx.reply("Usage: `!status your@email.com`")
        return
    
    db: RegistrationDatabase = ctx.bot.db
    status = db.check_status(email)
    
    if status:
        await ctx.reply(f"Registration status for `{email}`: {status}")
    else:
        await ctx.reply(f"No registration found for `{email}`. Use `!register` to submit!")


@commands.command(name="help")
async def help_command(ctx: commands.Context):
    """Show help information."""
    embed = discord.Embed(
        title="🎯 Fence Trading Bot",
        description="Get verified for VIP access!",
        color=0x06b6d4
    )
    embed.add_field(
        name="!register",
        value="Register for affiliate verification\n`!register Name, Country, email`",
        inline=False
    )
    embed.add_field(
        name="!status",
        value="Check your registration status\n`!status your@email.com`",
        inline=False
    )
    embed.add_field(
        name="How it works",
        value="1. Register with Trade Nation using our link\n2. Use `!register` to submit your details\n3. We verify your account\n4. Receive email with Telegram VIP links!",
        inline=False
    )
    await ctx.reply(embed=embed)


# ==================== SLASH COMMANDS ====================

class RegisterCommand(app_commands.Command):
    """Slash command for registration with a modal form."""
    
    def __init__(self, db: RegistrationDatabase):
        super().__init__(
            name="register",
            description="Register for Fence Trading VIP access",
            callback=self.callback
        )
        self.db = db
    
    async def callback(self, interaction: discord.Interaction):
        """Show registration modal."""
        modal = RegisterModal(self.db)
        await interaction.response.send_modal(modal)


class RegisterModal(discord.ui.Modal, title="📝 Register for VIP Access"):
    """Modal form for registration."""
    
    def __init__(self, db: RegistrationDatabase):
        super().__init__()
        self.db = db
    
    name_input = discord.ui.TextInput(
        label="Full Name (as on Trade Nation)",
        placeholder="John Doe",
        required=True,
        min_length=2,
        max_length=100
    )
    
    country_input = discord.ui.TextInput(
        label="Country",
        placeholder="Norway, UK, etc.",
        required=True,
        min_length=2,
        max_length=50
    )
    
    email_input = discord.ui.TextInput(
        label="Email Address",
        placeholder="your@email.com",
        required=True,
        min_length=5,
        max_length=100
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle form submission."""
        name = self.name_input.value
        country = self.country_input.value
        email = self.email_input.value.strip().lower()
        
        # Validate email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            await interaction.response.send_message(
                "❌ Invalid email format!",
                ephemeral=True
            )
            return
        
        # Add to database
        success, message = self.db.add_registration(
            name=name,
            email=email,
            country=country,
            discord_user_id=interaction.user.id
        )
        
        if success:
            embed = discord.Embed(
                title="✅ Registration Submitted!",
                description="Your details have been received.",
                color=0x10b981
            )
            embed.add_field(name="Name", value=name, inline=True)
            embed.add_field(name="Country", value=country, inline=True)
            embed.add_field(
                name="Next Steps",
                value="We will verify your Trade Nation registration and send you an email with your Telegram invite links!",
                inline=False
            )
            embed.set_footer(text=message)
            await interaction.response.send_message(embed=embed, ephemeral=True)
            
            # Log to admin channel
            log_channel = interaction.client.get_channel(DISCORD_LOG_CHANNEL_ID)
            if log_channel:
                log_embed = discord.Embed(
                    title="📝 New Registration (Discord /register)",
                    color=0x06b6d4,
                    timestamp=datetime.now()
                )
                log_embed.add_field(name="Name", value=name, inline=True)
                log_embed.add_field(name="Country", value=country, inline=True)
                log_embed.add_field(name="Email", value=email, inline=False)
                log_embed.add_field(name="Discord User", value=f"{interaction.user} ({interaction.user.id})", inline=False)
                await log_channel.send(embed=log_embed)
        else:
            await interaction.response.send_message(f"❌ {message}", ephemeral=True)


class StatusCommand(app_commands.Command):
    """Slash command to check registration status."""
    
    def __init__(self, db: RegistrationDatabase):
        super().__init__(
            name="status",
            description="Check your registration status",
            callback=self.callback
        )
        self.db = db
    
    @app_commands.describe(email="Your email address")
    async def callback(self, interaction: discord.Interaction, email: str):
        """Check status."""
        status = self.db.check_status(email)
        
        if status:
            await interaction.response.send_message(
                f"Registration status for `{email}`: {status}",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                f"No registration found for `{email}`. Use `/register` to submit!",
                ephemeral=True
            )


# ==================== MAIN ====================

async def main():
    """Main entry point."""
    if not DISCORD_BOT_TOKEN:
        logger.error("DISCORD_BOT_TOKEN not set!")
        return
    
    # Initialize database
    db = RegistrationDatabase(DB_PATH)
    logger.info(f"Database initialized: {DB_PATH}")
    
    # Create bot
    bot = FenceBot(db)
    
    # Add text commands
    bot.add_command(register_command)
    bot.add_command(status_command)
    bot.add_command(help_command)
    
    # Run
    try:
        await bot.start(DISCORD_BOT_TOKEN)
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    finally:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())
