#!/usr/bin/env python3
"""
Fence Trading - Bot Admin Service
=================================
A secure localhost-only HTTP API running on port 3005 that:
1. Checks Telethon session authorization status.
2. Initiates Telegram login requests (sends code to user).
3. Verifies login codes (and 2FA passwords) and saves the session string.
4. Reads logs and controls PM2 processes (status and restart).
"""

import os
import sys
import json
import asyncio
import subprocess
from aiohttp import web
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError
from dotenv import load_dotenv

# Load environment
script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(script_dir, 'fenceWeb.env'))
load_dotenv('fenceWeb.env') # Fallback to current dir

API_ID = int(os.getenv("API_ID") or os.getenv("TELEGRAM_API_ID") or "0")
API_HASH = os.getenv("API_HASH") or os.getenv("TELEGRAM_API_HASH")
SESSION_STRING_PATH = os.path.join(os.path.dirname(script_dir), "tg_session.txt")

# In-memory store for active sign-in clients
# key: phone_number -> val: { "client": TelegramClient, "phone_code_hash": str }
ACTIVE_SIGNINS = {}

def get_pm2_status():
    """Gets statuses of fence processes from PM2."""
    try:
        # Run pm2 jlist to get JSON output of running applications
        # On Windows, pm2 might be a cmd/ps1 script, so shell=True is needed
        cmd = "pm2 jlist"
        result = subprocess.check_output(cmd, shell=True, text=True)
        data = json.loads(result)
        
        apps = {}
        for app in data:
            name = app.get("name")
            if name in ("fence-bot", "fence-relay", "fence-affiliate", "fence-web"):
                apps[name] = {
                    "status": app.get("pm2_env", {}).get("status", "unknown"),
                    "cpu": app.get("monit", {}).get("cpu", 0),
                    "memory": app.get("monit", {}).get("memory", 0),
                    "restarts": app.get("pm2_env", {}).get("restart_time", 0)
                }
        return apps
    except Exception as e:
        return {"error": str(e)}

async def check_session_authorized():
    """Checks if the stored session string is authorized."""
    if not os.path.exists(SESSION_STRING_PATH):
        return False, "Session file not found"
        
    try:
        with open(SESSION_STRING_PATH, "r") as f:
            sess_str = f.read().strip()
        if not sess_str:
            return False, "Session string empty"
            
        client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
        await client.connect()
        authorized = await client.is_user_authorized()
        await client.disconnect()
        return authorized, "Authorized" if authorized else "Session expired"
    except Exception as e:
        return False, f"Error: {e}"

# ===================== API ENDPOINTS =====================

async def handle_status(request):
    """Returns bot session status and PM2 app statuses."""
    authorized, session_msg = await check_session_authorized()
    pm2_apps = get_pm2_status()
    
    return web.json_response({
        "telegram": {
            "authorized": authorized,
            "status": session_msg,
            "session_path": SESSION_STRING_PATH
        },
        "pm2": pm2_apps
    })

async def handle_connect(request):
    """Initiates Telegram connection and sends code."""
    try:
        body = await request.json()
        phone = body.get("phone")
        if not phone:
            return web.json_response({"error": "Telefonnummer er påkrevd"}, status=400)
            
        # Standardize phone number format (remove spaces)
        phone = phone.replace(" ", "").strip()
        
        # Clean up any existing connection for this phone
        if phone in ACTIVE_SIGNINS:
            try:
                await ACTIVE_SIGNINS[phone]["client"].disconnect()
            except:
                pass
            del ACTIVE_SIGNINS[phone]
            
        # Create a new Telethon client with StringSession
        client = TelegramClient(StringSession(), API_ID, API_HASH)
        await client.connect()
        
        # Send code request
        code_request = await client.send_code_request(phone)
        
        # Store in-memory
        ACTIVE_SIGNINS[phone] = {
            "client": client,
            "phone_code_hash": code_request.phone_code_hash
        }
        
        return web.json_response({
            "message": "Kode sendt til Telegram",
            "phone": phone,
            "phone_code_hash": code_request.phone_code_hash
        })
    except Exception as e:
        return web.json_response({"error": f"Tilkoblingsfeil: {e}"}, status=500)

async def handle_verify(request):
    """Verifies Telegram login code and saves the session string."""
    try:
        body = await request.json()
        phone = body.get("phone")
        code = body.get("code")
        phone_code_hash = body.get("phone_code_hash")
        password = body.get("password") # For 2-Factor Authentication
        
        if not phone or not code or not phone_code_hash:
            return web.json_response({"error": "Ufullstendige parametere"}, status=400)
            
        phone = phone.replace(" ", "").strip()
        
        signin_data = ACTIVE_SIGNINS.get(phone)
        if not signin_data:
            return web.json_response({"error": "Tilkobling utløpt. Vennligst start på nytt."}, status=400)
            
        client = signin_data["client"]
        
        try:
            # Sign in
            await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        except SessionPasswordNeededError:
            # Handle 2FA
            if not password:
                return web.json_response({
                    "error": "TOFA_PAREKREVD", 
                    "message": "Kontoen din har tofaktor-autentisering (2FA) aktivert. Vennligst skriv inn 2FA-passordet."
                }, status=401)
            await client.sign_in(password=password)
            
        # Successful sign-in! Save the session string
        session_str = client.session.save()
        with open(SESSION_STRING_PATH, "w") as f:
            f.write(session_str)
            
        # Clean up
        await client.disconnect()
        del ACTIVE_SIGNINS[phone]
        
        # Restart PM2 processes so they load the new session string
        try:
            # Restart bot and relay processes in background
            subprocess.Popen("pm2 restart fence-bot fence-relay", shell=True)
            pm2_msg = "PM2-prosesser restartes..."
        except Exception as e:
            pm2_msg = f"Klarte ikke restarte PM2: {e}"
            
        return web.json_response({
            "success": True,
            "message": "Innlogging fullført og økt lagret!",
            "pm2_status": pm2_msg
        })
    except Exception as e:
        return web.json_response({"error": f"Verifiseringsfeil: {e}"}, status=500)

async def handle_logs(request):
    """Returns the last 100 lines of bot logs."""
    try:
        app_name = request.query.get("app", "fence-bot")
        
        # Run pm2 logs app_name --raw --lines 100 --nobuster
        # On Windows, pm2 logs command works but can block, so we use pm2 logs --lines 100 --raw --nobuster
        cmd = f"pm2 logs {app_name} --lines 100 --raw --nobuster"
        # We can also directly try to read the log file from pm2 show
        # Running the logs command is safer and easier
        try:
            result = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.STDOUT, timeout=5)
            return web.Response(text=result, content_type="text/plain")
        except subprocess.TimeoutExpired:
            return web.Response(text="Timeout reading logs.", status=504)
        except Exception as e:
            return web.Response(text=f"Error reading logs: {e}", status=500)
    except Exception as e:
        return web.Response(text=str(e), status=500)

async def handle_action(request):
    """Triggers PM2 process actions (restart, stop, start)."""
    try:
        body = await request.json()
        action = body.get("action") # "restart", "stop", "start"
        app = body.get("app") # "fence-bot", "fence-relay", "all"
        
        if not action or not app:
            return web.json_response({"error": "Ufullstendige parametere"}, status=400)
            
        if action not in ("restart", "stop", "start") or app not in ("fence-bot", "fence-relay", "fence-affiliate", "all"):
            return web.json_response({"error": "Ugyldig handling eller app"}, status=400)
            
        cmd = f"pm2 {action} {app}"
        subprocess.Popen(cmd, shell=True)
        
        return web.json_response({
            "success": True,
            "message": f"Kommando '{cmd}' sendt til PM2."
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

# ===================== WEB SERVER =====================

app = web.Application()
app.router.add_get('/status', handle_status)
app.router.add_post('/connect', handle_connect)
app.router.add_post('/verify', handle_verify)
app.router.add_get('/logs', handle_logs)
app.router.add_post('/action', handle_action)

if __name__ == "__main__":
    # Host on localhost only for extreme security!
    # Port 3005 is internal and never exposed publicly.
    print("🚀 Bot Admin Service listening on http://127.0.0.1:3005...")
    web.run_app(app, host='127.0.0.1', port=3005)
