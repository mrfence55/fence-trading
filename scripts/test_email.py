"""
Fence Trading - Test Email Sender

Quick script to test email sending for verified/unverified users.

Usage:
    python test_email.py oscar_gjerde@hotmail.no
"""

import os
import sys
from dotenv import load_dotenv

# Add scripts directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

# Load environment
env_path = os.path.join(script_dir, 'fenceWeb.env')
load_dotenv(env_path)

from registration_service import RegistrationService

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_email.py <email>")
        print("Example: python test_email.py oscar_gjerde@hotmail.no")
        return
    
    email = sys.argv[1]
    service = RegistrationService()
    
    # Check if already verified
    affiliate = service.get_affiliate_by_email(email)
    
    if affiliate:
        print(f"✓ User found in verified affiliates!")
        print(f"  Name: {affiliate['name']}")
        print(f"  TN ID: {affiliate['user_id']}")
        print(f"  Verified: {affiliate['verified_at']}")
        
        # Send "already verified" confirmation email
        print("\nSending 'Already Verified' confirmation email...")
        success = send_already_verified_email(service, email, affiliate['name'])
        
    else:
        # Check if pending
        pending = None
        for p in service.get_pending_registrations():
            if p.email.lower() == email.lower():
                pending = p
                break
        
        if pending:
            print(f"⏳ User found in PENDING requests!")
            print(f"  Name: {pending.name}")
            print(f"  Status: {pending.status}")
            print(f"  Submitted: {pending.created_at}")
            print("\n→ They will receive email once verified against Trade Nation")
        else:
            print(f"✗ Email '{email}' not found in database")
            print("  They need to register first at /verify")
    
    return


def send_already_verified_email(service: RegistrationService, to_email: str, name: str) -> bool:
    """Send a confirmation email to already verified users."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    EMAIL_HOST = os.getenv("EMAIL_HOST", "send.one.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "465"))
    EMAIL_USER = os.getenv("EMAIL_USER", "post@fencetrading.no")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    
    if not EMAIL_PASSWORD:
        print("ERROR: EMAIL_PASSWORD not set")
        return False
    
    msg = MIMEMultipart('alternative')
    msg['From'] = EMAIL_USER
    msg['To'] = to_email
    msg['Subject'] = "✅ You're Already Verified - Fence Trading"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981, #06b6d4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .section {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }}
        .btn {{ display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Already Verified!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            <p>Great news - you're already verified in our system! 🎉</p>
            
            <div class="section">
                <h3>📱 Your Telegram Access</h3>
                <p><a href="https://t.me/FreeFenceTrading" class="btn">Join Telegram</a></p>
            </div>
            
            <div class="section">
                <h3>💬 Discord Community</h3>
                <p><a href="https://discord.gg/fencetrading" class="btn">Join Discord</a></p>
            </div>
            
            <p>Welcome to the Fence Trading community!</p>
            <p>Best regards,<br><strong>The Fence Trading Team</strong></p>
        </div>
    </div>
</body>
</html>
    """
    
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        if EMAIL_PORT == 465:
            server = smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT)
        else:
            server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
            server.starttls()
        
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✓ Email sent to {to_email}!")
        return True
    except Exception as e:
        print(f"✗ Email failed: {e}")
        return False


if __name__ == "__main__":
    main()
