#!/bin/bash

# OpenClaw Subscription Site - Quick Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🚀 OpenClaw Subscription Site - Quick Setup           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 2: Copy environment template
echo "⚙️  Step 2: Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
    echo "⚠️  Please edit .env with your actual values:"
    echo "   - DATABASE_URL (PostgreSQL connection)"
    echo "   - JWT_SECRET (min 32 chars)"
    echo ""
else
    echo "✅ .env already exists"
fi
echo ""

# Step 3: Setup Prisma
echo "🗄️  Step 3: Setting up Prisma..."
npm run prisma:generate
echo "✅ Prisma client generated"
echo ""

# Step 4: Information about database
echo "ℹ️  Step 4: Database Setup"
echo "   To initialize the database, you need to:"
echo "   1. Ensure PostgreSQL is running"
echo "   2. Update DATABASE_URL in .env"
echo "   3. Run: npm run prisma:migrate"
echo "   4. (Optional) Run: npm run prisma:seed"
echo ""

# Step 5: Success message
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                    ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                           ║"
echo "║  1. Edit .env with your configuration                 ║"
echo "║  2. Set up PostgreSQL database                         ║"
echo "║  3. Run: npm run prisma:migrate                        ║"
echo "║  4. Run: npm run dev                                   ║"
echo "║                                                        ║"
echo "║  Server will start on http://localhost:3000           ║"
echo "╚════════════════════════════════════════════════════════╝"
