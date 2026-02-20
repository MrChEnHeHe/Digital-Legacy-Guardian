@echo off
REM Cross-Bank Risk Control System Startup Script
REM Automatically activates virtual environment and starts the web interface

echo ========================================
echo Cross-Bank Risk Control System
echo ========================================
echo.

REM Switch to project root directory
cd /d "%~dp0.."

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [Error] Virtual environment not found
    echo Please run: python scripts\setup_venv.py
    pause
    exit /b 1
)

REM Activate virtual environment
echo [Activate] Virtual environment...
call venv\Scripts\activate.bat

REM Start Risk Control Web Interface
echo.
echo [Start] Risk Control Web Interface...
echo.
echo Access the system at: http://localhost:8502
echo.

streamlit run src/risk_control/web_interface.py --server.port 8502

echo.
echo ========================================
echo System closed
echo ========================================

REM Deactivate virtual environment
deactivate
