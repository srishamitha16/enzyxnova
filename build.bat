@echo off
REM ============================================================================
REM EnzyXNova Electron Desktop App Builder
REM ============================================================================
REM This script builds a Windows executable (.exe) using Electron
REM ============================================================================

setlocal enabledelayedexpansion
set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%"
set "NODE_MODULES=%FRONTEND_DIR%\node_modules"

echo.
echo ===================================================================
echo           EnzyXNova - Electron Build Script
echo ===================================================================
echo.

REM ============================================================================
REM Step 1: Install Node Dependencies
REM ============================================================================
echo [1/4] Installing Node Dependencies...

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
REM Step 2: Build Frontend Assets
REM ============================================================================
echo.
echo [2/4] Building Frontend Assets...

call npm run build -q
if !errorlevel! neq 0 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)
echo Frontend build completed successfully

REM ============================================================================
REM Step 3: Build Electron App
REM ============================================================================
echo.
echo [3/4] Building Electron Application...

call npm run electron-builder -q
if !errorlevel! neq 0 (
    echo ERROR: Failed to build Electron app
    pause
    exit /b 1
)
echo Electron build completed successfully

REM ============================================================================
REM Step 4: Verify Output
REM ============================================================================
echo.
echo [4/4] Verifying Build Output...

if exist "%FRONTEND_DIR%\dist-electron" (
    echo Build successful!
    echo.
    echo ===================================================================
    echo Desktop executable created in: dist-electron/
    echo ===================================================================
    echo.
    REM Find and display exe file
    for /r "%FRONTEND_DIR%\dist-electron" %%F in (*.exe) do (
        echo Found executable: %%F
        echo File size: %%~zF bytes
    )
) else (
    echo ERROR: Build output not found
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo Build Complete!
echo The Windows executable is ready for distribution.
echo ===================================================================
echo.

pause
