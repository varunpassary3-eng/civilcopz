#!/bin/bash

# CivilCOPZ SSL Setup Script
# This script sets up Let's Encrypt SSL certificates for production

set -e

DOMAIN="civilcopz.com"
EMAIL="admin@civilcopz.com"

echo "🔐 Setting up SSL certificates for $DOMAIN"
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo)"
    exit 1
fi

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily for certbot standalone mode
systemctl stop nginx

# Get SSL certificate
echo "🔑 Obtaining SSL certificate..."
certbot certonly --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Start nginx again
systemctl start nginx

# Set up auto-renewal
echo "🔄 Setting up auto-renewal..."
certbot renew --dry-run

# Create renewal hook to reload nginx
cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh

echo "✅ SSL setup complete!"
echo ""
echo "📋 Certificate Details:"
echo "   • Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   • Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "   • Auto-renewal: Enabled (runs twice daily)"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update nginx.prod.conf with your domain"
echo "   2. Copy nginx.prod.conf to /etc/nginx/sites-available/civilcopz"
echo "   3. Enable site: ln -s /etc/nginx/sites-available/civilcopz /etc/nginx/sites-enabled/"
echo "   4. Test config: nginx -t"
echo "   5. Reload nginx: systemctl reload nginx"