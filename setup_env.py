
import os

print("--- Setting up fenceWeb.env ---")

TOKEN = input("Please paste your DISCORD_BOT_TOKEN and press Enter: ").strip()

if not TOKEN:
    print("Error: Token cannot be empty.")
    exit(1)

content = f"DISCORD_BOT_TOKEN={TOKEN}"

with open("fenceWeb.env", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Success! fenceWeb.env created with correct encoding.")
print(f"Token saved: {TOKEN[:5]}...{TOKEN[-5:]}")
