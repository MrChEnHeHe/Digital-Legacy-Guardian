@echo off
REM Windows virtual environment activation and startup script
REM Automatically activates virtual environment and starts the project

echo ========================================
echo Post-Quantum Privacy Computing System
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

REM Check startup parameters
if "%1"=="" (
    echo.
    echo [Start] Interactive mode...
    python run_demo.py
) else if "%1"=="--web" (
    echo.
    echo [Start] Web interface...
    python run_demo.py --web
) else if "%1"=="--server" (
    echo.
    echo [Start] Server...
    python run_demo.py --server
) else if "%1"=="--client" (
    echo.
    echo [Start] Client...
    python run_demo.py --client
) else if "%1"=="--test" (
    echo.
    echo [Start] Tests...
    python run_demo.py --test
) else if "%1"=="--all" (
    echo.
    echo [Start] Full demo...
    python run_demo.py --all
) else (
    echo.
    echo [Start] Custom parameters...
    python run_demo.py %*
)

echo.
echo ========================================
echo Project closed
echo ========================================

REM Deactivate virtual environment
deactivate
