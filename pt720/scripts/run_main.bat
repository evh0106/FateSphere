@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

REM Define the base directory
for %%I in ("%~dp0..") do set "BASE_DIR=%%~fI"

REM Activate the virtual environment
call "%BASE_DIR%\.venv\Scripts\activate"

REM Set the Python path
set "PYTHONPATH=%BASE_DIR%"

REM Run the main program
python "%BASE_DIR%\src\main.py"

REM Deactivate the virtual environment
deactivate
