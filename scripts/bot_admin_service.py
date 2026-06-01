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
            if name in ("fence-bot", "fence-affiliate", "fence-web", "fence-admin"):
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
            subprocess.Popen("pm2 restart fence-bot", shell=True)
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

def get_pm2_log_paths(app_name):
    """Gets the stdout and stderr log file paths for a PM2 app dynamically."""
    try:
        cmd = "pm2 jlist"
        result = subprocess.check_output(cmd, shell=True, text=True)
        data = json.loads(result)
        for app in data:
            if app.get("name") == app_name:
                pm2_env = app.get("pm2_env", {})
                out_path = pm2_env.get("pm_out_log_path")
                err_path = pm2_env.get("pm_err_log_path")
                return out_path, err_path
    except Exception as e:
        print(f"Error getting log paths for {app_name}: {e}")
    return None, None

async def handle_logs(request):
    """Returns the last 100 lines of bot logs."""
    try:
        app_name = request.query.get("app", "fence-bot")

        # Get paths dynamically from PM2!
        out_path, err_path = get_pm2_log_paths(app_name)

        # Fallbacks if dynamic lookup fails
        if not out_path or not err_path:
            log_dir = os.path.expanduser("~/.pm2/logs")
            err_path = err_path or os.path.join(log_dir, f"{app_name}-err.log")
            out_path = out_path or os.path.join(log_dir, f"{app_name}-out.log")

        def get_last_lines(path, count=100):
            if not path or not os.path.exists(path):
                return f"[Loggfil finnes ikke på {path}]\n"
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    from collections import deque
                    lines = deque(f, maxlen=count)
                    return "".join(lines)
            except Exception as e:
                return f"[Feil ved lesing av {path}: {e}]\n"

        output = "=== STANDARD ERROR (Siste 100 linjer) ===\n"
        output += get_last_lines(err_path, 100)
        output += "\n=== STANDARD OUTPUT (Siste 100 linjer) ===\n"
        output += get_last_lines(out_path, 100)

        return web.Response(text=output, content_type="text/plain")
    except Exception as e:
        return web.Response(text=f"Error: {e}", status=500)

async def handle_action(request):
    """Triggers PM2 process actions (restart, stop, start)."""
    try:
        body = await request.json()
        action = body.get("action") # "restart", "stop", "start"
        app = body.get("app") # "fence-bot", "fence-affiliate", "fence-web", "fence-admin", "all"
        
        if not action or not app:
            return web.json_response({"error": "Ufullstendige parametere"}, status=400)
            
        active_apps = ("fence-bot", "fence-affiliate", "fence-web", "fence-admin")
        if action not in ("restart", "stop", "start") or app not in (*active_apps, "all"):
            return web.json_response({"error": "Ugyldig handling eller app"}, status=400)
            
        target = " ".join(active_apps) if app == "all" else app
        cmd = f"pm2 {action} {target}"
        subprocess.Popen(cmd, shell=True)
        
        return web.json_response({
            "success": True,
            "message": f"Kommando '{cmd}' sendt til PM2."
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

async def handle_deploy(request):
    """Full deploy: git pull -> npm run build -> pm2 restart all.
    Runs the build in the background and streams output."""
    try:
        # Get the project root (one level up from scripts/)
        project_root = os.path.dirname(script_dir)
        
        steps = []
        
        # Step 1: git pull
        try:
            result = subprocess.run(
                "git pull origin main",
                shell=True, cwd=project_root,
                capture_output=True, text=True, timeout=60
            )
            steps.append({
                "step": "git pull",
                "returncode": result.returncode,
                "stdout": result.stdout[-500:] if result.stdout else "",
                "stderr": result.stderr[-500:] if result.stderr else ""
            })
            if result.returncode != 0:
                return web.json_response({
                    "success": False,
                    "error": "git pull failed",
                    "steps": steps
                }, status=500)
        except subprocess.TimeoutExpired:
            return web.json_response({
                "success": False,
                "error": "git pull timed out after 60s"
            }, status=500)
        
        # Step 2: npm run build (longer timeout)
        try:
            result = subprocess.run(
                "npm run build",
                shell=True, cwd=project_root,
                capture_output=True, text=True, timeout=300
            )
            steps.append({
                "step": "npm run build",
                "returncode": result.returncode,
                "stdout": result.stdout[-1000:] if result.stdout else "",
                "stderr": result.stderr[-1000:] if result.stderr else ""
            })
            if result.returncode != 0:
                return web.json_response({
                    "success": False,
                    "error": "npm run build failed",
                    "steps": steps
                }, status=500)
        except subprocess.TimeoutExpired:
            return web.json_response({
                "success": False,
                "error": "npm run build timed out after 300s",
                "steps": steps
            }, status=500)
        
        # Step 3: pm2 restart all
        try:
            result = subprocess.run(
                "pm2 restart all",
                shell=True, cwd=project_root,
                capture_output=True, text=True, timeout=30
            )
            steps.append({
                "step": "pm2 restart all",
                "returncode": result.returncode,
                "stdout": result.stdout[-500:] if result.stdout else "",
                "stderr": result.stderr[-500:] if result.stderr else ""
            })
        except subprocess.TimeoutExpired:
            steps.append({"step": "pm2 restart all", "warning": "timed out but may still be running"})
        
        return web.json_response({
            "success": True,
            "message": "Deploy fullført! Ny kode er live.",
            "steps": steps
        })
    except Exception as e:
        return web.json_response({"error": f"Deploy-feil: {e}"}, status=500)

# ===================== WEB SERVER =====================

app = web.Application()
app.router.add_get('/status', handle_status)
app.router.add_post('/connect', handle_connect)
app.router.add_post('/verify', handle_verify)
app.router.add_get('/logs', handle_logs)
app.router.add_post('/action', handle_action)
app.router.add_post('/deploy', handle_deploy)

if __name__ == "__main__":
    # Host on localhost only for extreme security!
    # Port 3005 is internal and never exposed publicly.
    print("🚀 Bot Admin Service listening on http://127.0.0.1:3005...")
    web.run_app(app, host='127.0.0.1', port=3005)
