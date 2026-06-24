# PT720

## Rules
Winning is determined by the number of consecutive matches starting from the last digit between the number I selected and the 1st place or bonus place number determined by the draw, among numbers from 1 trillion 000000 to 5 trillion 999999.

- 1st Prize - When all 7 consecutive digits match the 1st prize winning number
- 2nd Prize - When all 6 consecutive digits from the right end match the 1st prize winning number
- 3rd Prize - When all 5 consecutive digits from the right end match the 1st prize winning number
- 4th Prize - When all 4 consecutive digits from the right end match the 1st prize winning number
- 5th Prize - When all 3 consecutive digits from the right end match the 1st prize winning number
- 6th Prize - When all 2 consecutive digits from the right end match the 1st prize winning number
- 7th Prize - When the 1 digit from the right end matches the 1st prize winning number
- Bonus - When all 6 consecutive digits from the right end match the bonus prize winning number

## Result info
https://www.dhlottery.co.kr/pt720/result


## Python Development Environment Setup

### 1. Prerequisites
- Install Python 3.11 or newer
- Ensure `python` is available in terminal

Check versions:

```powershell
python --version
python -m pip --version
```

### 2. Create and activate virtual environment

From the project root:

```powershell
python -m venv .venv
```

Activate on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Activate on CMD:

```cmd
.venv\Scripts\activate.bat
```

Activate on macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Upgrade pip and install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Prerequisites

Install FastAPI and Uvicorn (already in `requirements.txt`):

```powershell
python -m pip install -r requirements.txt
```