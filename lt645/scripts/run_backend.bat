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
    py -3.14 -m venv "%BASE_DIR%\.venv"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        echo Make sure Python 3.11 is installed and available via the "py" launcher.
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
REM --app-dir adds lt645\src to sys.path so all sibling modules are importable.
REM -----------------------------------------------------------------------
set "PYTHONPATH=%BASE_DIR%\src"

echo Starting lt645 backend on http://localhost:8000
echo Press Ctrl+C to stop.

"%VENV_PYTHON%" -m uvicorn server:app ^
    --app-dir "%BASE_DIR%\src" ^
    --host 0.0.0.0 ^
    --port 8000 ^
    --reload
