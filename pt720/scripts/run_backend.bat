@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

REM Resolve project root (one level up from this scripts/ folder)
for %%I in ("%~dp0..") do set "BASE_DIR=%%~fI"

set "VENV_PYTHON=%BASE_DIR%\.venv\Scripts\python.exe"

REM -----------------------------------------------------------------------
REM If the virtual environment does not exist, create it and install deps.
REM -----------------------------------------------------------------------
if not exist "%VENV_PYTHON%" (
    echo Virtual environment not found. Creating...
    python -m venv "%BASE_DIR%\.venv"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Installing dependencies...
    "%VENV_PYTHON%" -m pip install --upgrade pip --quiet
    "%VENV_PYTHON%" -m pip install -r "%BASE_DIR%\requirements.txt" --quiet
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
    echo Setup complete.
)

REM -----------------------------------------------------------------------
REM Launch the FastAPI server via uvicorn.
REM -----------------------------------------------------------------------
set "PYTHONPATH=%BASE_DIR%\src"

echo Starting pt720 backend on http://localhost:8001
echo Press Ctrl+C to stop.

"%VENV_PYTHON%" -m uvicorn server:app ^
    --app-dir "%BASE_DIR%\src" ^
    --host 0.0.0.0 ^
    --port 8001 ^
    --reload
