@echo off
REM ============================================================================
REM EnzyXNova One-Click Startup Script
REM ============================================================================
REM This script handles:
REM - Backend virtual environment setup
REM - Backend package installation
REM - Backend startup (FastAPI)
REM - Frontend package installation
REM - Frontend startup (production build + server)
REM - Automatic browser launch
REM ============================================================================

setlocal enabledelayedexpansion
set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONTEND_DIR=%PROJECT_DIR%"
set "VENV_DIR=%PROJECT_DIR%venv"
set "NODE_MODULES=%FRONTEND_DIR%\node_modules"

echo.
echo ===================================================================
echo           EnzyXNova - One-Click Startup
echo ===================================================================
echo.

REM ============================================================================
REM Step 1: Backend Setup
REM ============================================================================
echo [1/6] Checking Python Virtual Environment...

if not exist "%VENV_DIR%" (
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
    if !errorlevel! neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully
) else (
    echo Virtual environment already exists
)

REM Activate virtual environment
echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"
if !errorlevel! neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM ============================================================================
REM Step 2: Install Backend Dependencies
REM ============================================================================
echo.
echo [2/6] Installing Python Dependencies...

cd /d "%BACKEND_DIR%"
python -m pip install --upgrade pip setuptools wheel -q
python -m pip install -r requirements.txt -q
if !errorlevel! neq 0 (
    echo ERROR: Failed to install Python packages
    pause
    exit /b 1
)
echo Python dependencies installed successfully

REM ============================================================================
REM Step 3: Start Backend
REM ============================================================================
echo.
echo [3/6] Starting Backend Server (FastAPI)...
echo Backend running on http://localhost:8000

cd /d "%PROJECT_DIR%"

REM Start backend in new window
start "EnzyXNova Backend" cmd /k "title EnzyXNova Backend & call venv\Scripts\activate.bat & cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM ============================================================================
REM Step 4: Install Frontend Dependencies
REM ============================================================================
echo.
echo [4/6] Installing Node Dependencies...

cd /d "%FRONTEND_DIR%"

if not exist "%NODE_MODULES%" (
    echo Installing npm packages...
    call npm install -q
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install npm packages
        pause
        exit /b 1
    )
    echo npm packages installed successfully
) else (
    echo npm packages already installed
)

REM ============================================================================
REM Step 5: Start Frontend Server
REM ============================================================================
echo.
echo [5/6] Starting Frontend Server...

REM Start frontend dev server
start "EnzyXNova Frontend" cmd /k "title EnzyXNova Frontend & call npm run dev"

REM Wait for frontend to start
timeout /t 4 /nobreak > nul

REM ============================================================================
REM Step 6: Open Browser
REM ============================================================================
echo.
echo [6/6] Opening browser at http://localhost:5173...
timeout /t 2 /nobreak > nul

REM Try to open with default browser
start "" "http://localhost:5173"

echo.
echo ===================================================================
echo EnzyXNova is running!
echo ===================================================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo Docs:     http://localhost:8000/docs
echo.
echo Press Ctrl+C in any terminal window to stop that service
echo ===================================================================
echo.

pause
