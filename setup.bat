@echo off
REM OpenClaw Subscription Site - Quick Setup Script (Windows)

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  🚀 OpenClaw Subscription Site - Quick Setup           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js version: %NODE_VERSION%
echo ✅ npm version: %NPM_VERSION%
echo.

REM Step 1: Install dependencies
echo 📦 Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Step 2: Copy environment template
echo ⚙️  Step 2: Setting up environment variables...
if not exist .env (
    copy .env.example .env
    echo ✅ Created .env from .env.example
    echo ⚠️  Please edit .env with your actual values:
    echo    - DATABASE_URL (PostgreSQL connection^)
    echo    - JWT_SECRET (min 32 chars^)
    echo.
) else (
    echo ✅ .env already exists
)
echo.

REM Step 3: Setup Prisma
echo 🗄️  Step 3: Setting up Prisma...
call npm run prisma:generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo ✅ Prisma client generated
echo.

REM Step 4: Information about database
echo ℹ️  Step 4: Database Setup
echo    To initialize the database, you need to:
echo    1. Ensure PostgreSQL is running
echo    2. Update DATABASE_URL in .env
echo    3. Run: npm run prisma:migrate
echo    4. (Optional^) Run: npm run prisma:seed
echo.

REM Step 5: Success message
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  ✅ Setup Complete!                                    ║
echo ╠════════════════════════════════════════════════════════╣
echo ║  Next steps:                                           ║
echo ║  1. Edit .env with your configuration                 ║
echo ║  2. Set up PostgreSQL database                         ║
echo ║  3. Run: npm run prisma:migrate                        ║
echo ║  4. Run: npm run dev                                   ║
echo ║                                                        ║
echo ║  Server will start on http://localhost:3000           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

pause
