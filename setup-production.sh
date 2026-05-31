#!/bin/bash
# EnzyXNova Production Setup Script
# This script sets up the app for production deployment

echo "=========================================="
echo "EnzyXNova Production Setup"
echo "=========================================="

# Install production dependencies
echo "Installing production dependencies..."
npm install --production
npm install express http-proxy-middleware

# Build frontend
echo "Building frontend assets..."
npm run build

# Create production environment file
echo "Creating .env.production..."
cat > .env.production << 'EOF'
ENVIRONMENT=production
VITE_API_URL=/api
EOF

echo "=========================================="
echo "Production setup complete!"
echo "=========================================="
echo ""
echo "To start production server:"
echo "  node server.js"
echo ""
echo "Or with Render/Heroku:"
echo "  Set environment variable: BACKEND_URL=your-backend-url"
echo "  Then deploy this directory"
echo ""
