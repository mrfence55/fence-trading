#!/bin/bash

# Exit on error
set -e

DOMAIN="fencetrading.no"
EMAIL="admin@fencetrading.no" # Change this if needed

echo "--- Starting VPS Setup for $DOMAIN ---"

# 1. Update System
echo "--- Updating System ---"
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Node.js (v20)
echo "--- Installing Node.js ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Python 3 & Pip
echo "--- Installing Python & Pip ---"
sudo apt-get install -y python3 python3-pip python3-venv

# 4. Install PM2
echo "--- Installing PM2 ---"
sudo npm install -g pm2

# 5. Install Nginx & Certbot
echo "--- Installing Nginx & Certbot ---"
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 6. Configure Nginx
echo "--- Configuring Nginx ---"
sudo rm -f /etc/nginx/sites-enabled/default

# Create Nginx config
cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. Install Project Dependencies
echo "--- Installing Project Dependencies ---"
# Python deps
pip3 install aiosqlite aiohttp telethon --break-system-packages

# Node deps
npm install

# 8. Build Next.js App
echo "--- Building Website ---"
npm run build

# 9. Setup SSL (Certbot)
echo "--- Setting up SSL ---"
# Non-interactive mode, agree to TOS, register email
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

# 10. Start PM2
echo "--- Starting Application ---"
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash # Execute the command pm2 tells us to run

echo "--- Setup Complete! ---"
echo "Your website should be live at https://$DOMAIN"
echo "Your bot is running in the background."
