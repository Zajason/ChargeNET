#!/bin/bash

# Reset script - Simulates a fresh clone for testing setup.sh
# ⚠️  WARNING: This will delete all local data!

echo "⚠️  This will reset everything to test the setup script!"
echo "   - Stop all services"
echo "   - Delete node_modules"
echo "   - Delete .env files"
echo "   - Delete Docker volumes (database data)"
echo ""
read -p "Are you sure? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Cancelled."
    exit 0
fi

echo "Stopping Docker containers..."
docker compose down -v

echo "Removing backend node_modules and .env..."
rm -rf back-end/node_modules
rm -f back-end/.env

echo "Removing frontend node_modules and .env.local..."
rm -rf front-end/node_modules
rm -rf front-end/.next
rm -f front-end/.env.local

echo "✅ Reset complete! Now run: ./setup.sh"
