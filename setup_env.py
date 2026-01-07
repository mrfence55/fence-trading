
import os

print("\n--- 🔐 Fence Trading Setup: Secrets Manager ---")
print("This script will configure the environment for the Website And the Bot.")
print("Please have your passwords and tokens ready.\n")

def get_input(prompt, required=True, default=None):
    if default:
        user_input = input(f"{prompt} [{default}]: ").strip()
        return user_input if user_input else default
    else:
        while True:
            user_input = input(f"{prompt}: ").strip()
            if user_input or not required:
                return user_input
            print("Error: This field is required.")

# 1. Website Configuration (.env.local)
print("\n[1/2] Website Configuration (Next.js)")
webhook_url = get_input("Paste your DISCORD_WEBHOOK_URL (from Channel Integration)")

with open(".env.local", "w", encoding="utf-8") as f:
    f.write(f"DISCORD_WEBHOOK_URL={webhook_url}\n")
    f.write("NEXT_PUBLIC_API_URL=http://localhost:3000\n")

print("✅ Created .env.local")

# 2. Bot Configuration (scripts/fenceWeb.env)
print("\n[2/2] Bot Configuration (Python)")
bot_token = get_input("Paste your DISCORD_BOT_TOKEN")
tn_user = get_input("Trade Nation Username", default="mr.fence")
tn_pass = get_input("Trade Nation Password")
smtp_pass = get_input("Email (Hotmail) Password")
channel_id = get_input("Discord Verification Channel ID", default="1442460270285820036")

content = f"""
DISCORD_BOT_TOKEN={bot_token}
TN_USERNAME={tn_user}
TN_PASSWORD={tn_pass}
EMAIL_PASSWORD={smtp_pass}
DISCORD_VERIFY_CHANNEL_ID={channel_id}
"""

# Ensure scripts dir exists
if not os.path.exists("scripts"):
    os.makedirs("scripts")

with open("scripts/fenceWeb.env", "w", encoding="utf-8") as f:
    f.write(content.strip())

print("\n✅ Success! 'scripts/fenceWeb.env' created.")
print("🚀 You are ready to run: npm run dev & pm2 start fence-affiliate")
