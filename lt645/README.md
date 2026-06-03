# lt645

## Rules
Win based on the number of matches between the 6 numbers you select from 1 to 45 and the numbers determined by the draw!  
The number draw is conducted a total of 7 times  
The first six numbers are the winning numbers, and the final seventh number is the bonus number for the second-place winner.

- 1st Place - Match 6 numbers
- 2nd Place - Match 5 numbers + Match bonus number
- 3rd Place - Match 5 numbers
- 4th Place - Match 4 numbers
- 5th Place - Match 3 numbers

## Result info
https://www.dhlottery.co.kr/lt645/result


## Features of this program
- When executed, the menu is configured via the console CLI.
- A function that performs mathematical calculations of winning probabilities from 1st to 5th place and outputs the results.
- A function that converts the lt645\docs\result.md file to the lt645\db\result.csv file.
- A function that crawls lottery result sites to collect results and adds them to the database.
- A function that reads the lt645\db\result.csv file and outputs the results.


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

If `requirements.txt` does not exist yet, create it after initial dependency install:

```powershell
python -m pip freeze > requirements.txt
```
