@echo off
REM Simple Windows startup script

cd /d "%~dp0.."

if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found
    echo Please run: python scripts\setup_venv.py
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Starting Web interface...
python run_demo.py --web

decho Done.
deactivate
