#!/bin/bash

set -e

echo "🚀 HK Camera Oracle Cloud Setup"
echo "================================"

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker ubuntu
newgrp docker

# Install Tailscale
echo "🌐 Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

# Clone repo if not already cloned
if [ ! -d ~/hk-camera ]; then
  echo "📥 Cloning repository..."
  cd ~
  git clone https://github.com/harkishansohanpal/hk-camera.git
fi

cd ~/hk-camera

# Create backend .env
echo "⚙️  Creating backend .env..."
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://hk:hk_secure_password_123@postgres:5432/hkdb
REDIS_URL=redis://redis:6379
STORAGE_STRATEGY=local
JWT_SECRET=hk_jwt_secret_make_this_longer_and_more_random_123456789
SESSION_SECRET=hk_session_secret_make_this_longer_and_more_random_123456789
EOF

echo "✅ Backend .env created"

# Verify Docker works
echo "🔍 Verifying Docker installation..."
docker --version
docker-compose --version

# Start services
echo "🚀 Starting Docker services..."
sudo docker-compose up -d

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Start Tailscale:"
echo "   sudo tailscale up"
echo ""
echo "2. Follow the link to authenticate with your Tailscale account"
echo ""
echo "3. Once authenticated, run:"
echo "   tailscale status"
echo ""
echo "4. Get your Tailscale IP and access:"
echo "   Frontend: http://<your-tailscale-ip>:3000"
echo "   API: http://<your-tailscale-ip>:5000"
echo ""
echo "View logs:"
echo "   sudo docker-compose logs -f backend"
echo ""
