#!/bin/bash
# /ai/halo_admin_module/deploy.sh
#
# Use this script AFTER you have manually updated the application files.
#

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting deployment for Halo Admin Module..."
echo "Assuming application files are already updated."

# Navigate to the project directory
cd /ai/halo_admin_module || { echo "Failed to cd into project directory"; exit 1; }

echo "📦 Building frontend assets..."
cd /ai/halo_admin_module/ui || { echo "Failed to cd into UI directory"; exit 1; }
npm run build
cd ..

echo "🔄 Restarting application services..."
sudo systemctl restart ham-api.service
sudo systemctl restart ham-grpc.service

echo "✅ Deployment finished. Verifying services..."
sleep 2 # Give services a moment to start

sudo systemctl is-active --quiet ham-api.service && echo "🟢 ham-api.service is active." || echo "🔴 ham-api.service failed to start."
sudo systemctl is-active --quiet ham-grpc.service && echo "🟢 ham-grpc.service is active." || echo "🔴 ham-grpc.service failed to start."

echo "🎉 All steps complete."
