"""
lt645 FastAPI backend server.
Provides REST endpoints that mirror the CLI menu actions.
Run via: scripts/run_backend.bat
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add src/ directory to the Python path so that relative imports work correctly
# regardless of the working directory the server is launched from.
_SRC = Path(__file__).resolve().parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from typing import Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from common import DB_GN_PATH, DB_RESULT_PATH, DB_EXCLUDED_COMBINATIONS_PATH, DB_EXCLUDE_RULES_PATH, read_csv_rows
from convert_results import convert_result_md_to_csv
from crawl_results import crawl_new_results, crawl_results_in_range
from my_combinations import (
    generate_my_number_combinations,
    load_excluded_combinations,
    save_excluded_combinations,
)

app = FastAPI(title="lt645 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _combo_to_id(combo: tuple[int, ...]) -> str:
    """Produce a stable string ID from a sorted 6-number tuple."""
    return "-".join(str(n) for n in sorted(combo))


def _id_to_combo(combo_id: str) -> tuple[int, ...] | None:
    """Parse a combo ID back to a sorted tuple; return None if invalid."""
    try:
        parts = [int(x) for x in combo_id.split("-")]
    except ValueError:
        return None
    if len(parts) != 6:
        return None
    return tuple(sorted(parts))


# ---------------------------------------------------------------------------
# Result rows
# ---------------------------------------------------------------------------

class ResultRow(BaseModel):
    round: int
    draw_date: Optional[str] = None
    n1: int
    n2: int
    n3: int
    n4: int
    n5: int
    n6: int
    bonus: int


def _csv_row_to_result(row: dict[str, str]) -> ResultRow | None:
    try:
        return ResultRow(
            round=int(row["Round"]),
            n1=int(row["No1"]),
            n2=int(row["No2"]),
            n3=int(row["No3"]),
            n4=int(row["No4"]),
            n5=int(row["No5"]),
            n6=int(row["No6"]),
            bonus=int(row["Bonus"]),
        )
    except (KeyError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CrawlRangeRequest(BaseModel):
    startRound: int = Field(gt=0)
    endRound: int = Field(gt=0)


class AddExcludedRequest(BaseModel):
    numbers: list[int]


class GenerateRequest(BaseModel):
    count: int = Field(default=5, gt=0)


class DeleteGeneratedFilesRequest(BaseModel):
    file_names: list[str] = Field(min_length=1)


class AddExcludeRuleRequest(BaseModel):
    rule_name: str
    function_name: str


class ExcludeRuleModel(BaseModel):
    rule_name: str
    function_name: str
    start_round: str
    end_round: str
    updated_at: str
    is_active: str


class SaveExcludeRulesRequest(BaseModel):
    rules: list[ExcludeRuleModel]


# ---------------------------------------------------------------------------
# Menu 2 – Convert docs/result.md → db/result.csv
# ---------------------------------------------------------------------------

@app.post("/api/lt645/convert")
def convert():
    """Convert docs/result.md → db/result.csv (CLI menu 2)."""
    try:
        count = convert_result_md_to_csv()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"converted": count}


# ---------------------------------------------------------------------------
# Menu 3 – Crawl new lottery results
# ---------------------------------------------------------------------------

@app.post("/api/lt645/crawl")
def crawl():
    """Fetch new draw results and append to db/result.csv (CLI menu 3)."""
    count = crawl_new_results()
    return {"crawled": count}


# ---------------------------------------------------------------------------
# Menu 4 – Crawl results by round range
# ---------------------------------------------------------------------------

@app.post("/api/lt645/crawl-range")
def crawl_range(body: CrawlRangeRequest):
    """Fetch draws for a specific round range (CLI menu 4)."""
    if body.startRound > body.endRound:
        raise HTTPException(
            status_code=422,
            detail="startRound must be less than or equal to endRound",
        )
    try:
        count = crawl_results_in_range(body.startRound, body.endRound)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"crawled": count}


# ---------------------------------------------------------------------------
# Menu 5 – Show db/result.csv
# ---------------------------------------------------------------------------

@app.get("/api/lt645/results")
def get_results(
    startRound: Optional[int] = None,
    endRound: Optional[int] = None,
    limit: Optional[int] = None,
):
    """Return rows from db/result.csv (CLI menu 5)."""
    if startRound is not None and startRound <= 0:
        raise HTTPException(status_code=422, detail="startRound must be positive")
    if endRound is not None and endRound <= 0:
        raise HTTPException(status_code=422, detail="endRound must be positive")
    if startRound is not None and endRound is not None and startRound > endRound:
        raise HTTPException(
            status_code=422,
            detail="startRound must be less than or equal to endRound",
        )

    raw_rows = read_csv_rows()
    try:
        raw_rows.sort(key=lambda r: int(r.get("Round", 0)), reverse=True)
    except ValueError:
        pass

    if startRound is not None or endRound is not None:
        filtered: list[dict[str, str]] = []
        for row in raw_rows:
            try:
                round_no = int(row.get("Round", 0))
            except ValueError:
                continue
            if startRound is not None and round_no < startRound:
                continue
            if endRound is not None and round_no > endRound:
                continue
            filtered.append(row)
        raw_rows = filtered
    elif limit is not None:
        raw_rows = raw_rows[:limit]

    rows = [r for r in (_csv_row_to_result(row) for row in raw_rows) if r is not None]
    return {"rows": rows}


# ---------------------------------------------------------------------------
# Menu 6 – Manage excluded number combinations
# ---------------------------------------------------------------------------

class ExcludedCombination(BaseModel):
    id: str
    numbers: list[int]


@app.get("/api/lt645/excluded")
def list_excluded():
    """Return all excluded number combinations (CLI menu 6 – show)."""
    combos = load_excluded_combinations()
    rows = [
        ExcludedCombination(id=_combo_to_id(combo), numbers=list(combo))
        for combo in sorted(combos)
    ]
    return {"rows": rows}


@app.post("/api/lt645/excluded", status_code=201)
def add_excluded(body: AddExcludedRequest):
    """Add a new excluded combination (CLI menu 6 – add)."""
    nums = body.numbers
    if len(nums) != 6:
        raise HTTPException(status_code=422, detail="Exactly 6 numbers are required")
    if any(n < 1 or n > 45 for n in nums):
        raise HTTPException(status_code=422, detail="Numbers must be between 1 and 45")
    if len(set(nums)) != 6:
        raise HTTPException(status_code=422, detail="All numbers must be unique")

    combo = tuple(sorted(nums))
    combos = load_excluded_combinations()
    if combo in combos:
        raise HTTPException(status_code=409, detail="Combination already excluded")

    combos.add(combo)
    save_excluded_combinations(combos)
    return ExcludedCombination(id=_combo_to_id(combo), numbers=list(combo))


@app.delete("/api/lt645/excluded/{combo_id}", status_code=204)
def delete_excluded(combo_id: str):
    """Remove an excluded combination by its ID (CLI menu 6 – remove)."""
    combo = _id_to_combo(combo_id)
    if combo is None:
        raise HTTPException(status_code=422, detail="Invalid combination id")

    combos = load_excluded_combinations()
    if combo not in combos:
        raise HTTPException(status_code=404, detail="Combination not found")

    combos.remove(combo)
    save_excluded_combinations(combos)
    return Response(status_code=204)


@app.post("/api/lt645/exclude-rules", status_code=201)
def add_exclude_rule(body: AddExcludeRuleRequest):
    """Add a new exclude rule to exclude_rules.csv."""
    import csv
    from datetime import datetime

    rule_name = body.rule_name.strip()
    function_name = body.function_name.strip()

    if not rule_name or not function_name:
        raise HTTPException(status_code=422, detail="Both rule_name and function_name are required")

    path = DB_EXCLUDE_RULES_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = path.exists()

    updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    fieldnames = ["rule_name", "function_name", "start_round", "end_round", "updated_at", "is_active"]

    try:
        with path.open("a", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                "rule_name": rule_name,
                "function_name": function_name,
                "start_round": "1",
                "end_round": "",
                "updated_at": updated_at,
                "is_active": "Y",
            })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write to file: {str(exc)}")

    return {
        "message": "Exclude rule saved successfully",
        "rule_name": rule_name,
        "function_name": function_name,
        "start_round": "1",
        "end_round": "",
        "updated_at": updated_at,
        "is_active": "Y",
    }


@app.get("/api/lt645/exclude-rules")
def list_exclude_rules():
    """Return all exclude rules from db/exclude_rules.csv."""
    import csv

    path = DB_EXCLUDE_RULES_PATH
    if not path.exists():
        return {"rows": []}

    rows = []
    try:
        with path.open(encoding="utf-8", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                rows.append({
                    "rule_name": row.get("rule_name", ""),
                    "function_name": row.get("function_name", ""),
                    "start_round": row.get("start_round", "1"),
                    "end_round": row.get("end_round", ""),
                    "updated_at": row.get("updated_at", ""),
                    "is_active": row.get("is_active", "Y"),
                })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(exc)}")

    return {"rows": rows}


@app.put("/api/lt645/exclude-rules")
def save_exclude_rules(body: SaveExcludeRulesRequest):
    """Save all exclude rules to db/exclude_rules.csv."""
    import csv
    
    path = DB_EXCLUDE_RULES_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    
    fieldnames = ["rule_name", "function_name", "start_round", "end_round", "updated_at", "is_active"]
    
    try:
        with path.open("w", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            for rule in body.rules:
                writer.writerow(rule.dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write to file: {str(exc)}")

    return {"message": "Exclude rules saved successfully", "count": len(body.rules)}

@app.post("/api/lt645/exclude-rules/generate")
def generate_exclude_rules(body: SaveExcludeRulesRequest):
    """Generate exclude rules based on the provided rules and save to db/excluded_combinations.csv."""
    import csv
    from datetime import datetime

    # 제외목록에서 is_active가 "Y"인 규칙들만으로 제외 숫자를 생성하여 저장
    active_rules = [rule for rule in body.rules if rule.is_active.upper() == "Y"]
    if not active_rules:
        raise HTTPException(status_code=422, detail="No active rules provided for generation")
    else:
        print(f"Generating exclude combinations based on {len(active_rules)} active rules.")

    # active_rules에서 start_round 가 1 이상인 규칙들의 function_name을 추출하여 my_combinations 모듈의 run_exclude_rule_on_results 함수를 호출하여 제외 조합을 생성
    from my_combinations import run_exclude_rule_on_results

    # Filter rules with start_round >= 1
    filtered_rules = [rule for rule in active_rules if int(rule.start_round if rule.start_round else 0) >= 1]
    if not filtered_rules:
        raise HTTPException(status_code=422, detail="No active rules with start_round >= 1 provided for generation")

    generated_combos = []
    for rule in filtered_rules:
        function_name = rule.function_name
        excluded = run_exclude_rule_on_results(function_name)

        print (f"run_exclude_rule_on_results '{rule.rule_name}' (function: {function_name}) generated {len(excluded)} excluded combinations.")

        for combo in excluded:
            generated_combos.append({
                "function_name": function_name,
                "No1": combo["numbers"][0],
                "No2": combo["numbers"][1],
                "No3": combo["numbers"][2],
                "No4": combo["numbers"][3],
                "No5": combo["numbers"][4],
                "No6": combo["numbers"][5],
            })

    # active_rules에서 start_round와 end_round 값이 모두 없는 규칙들의 function_name을 추출하여 my_combinations 모듈의 generate_excluded_rules 함수를 호출하여 제외 조합을 생성
    from my_combinations import generate_excluded_rules

    no_round_rules = [rule for rule in active_rules if int(rule.start_round if rule.start_round else 0) <= 0 and int(rule.end_round if rule.end_round else 0) <= 0]

    print(f"Generating exclude combinations based on {len(no_round_rules)} rules without start_round and end_round.")

    for rule in no_round_rules:
        function_name = rule.function_name
        excluded = generate_excluded_rules(function_name)

        print (f"generate_excluded_rules '{rule.rule_name}' (function: {function_name}) generated {len(excluded)} excluded combinations.")

        for combo in excluded:
            generated_combos.append({
                "function_name": function_name,
                "No1": combo[0],
                "No2": combo[1],
                "No3": combo[2],
                "No4": combo[3],
                "No5": combo[4],
                "No6": combo[5],
            })
    
    # # generated_combos 내 숫자를 정렬하고 중복 제거
    # unique_combos = {}
    # for combo in generated_combos:
    #     combo_key = tuple(sorted([combo["function_name"], combo["No1"], combo["No2"], combo["No3"], combo["No4"], combo["No5"], combo["No6"]]))
    #     if combo_key not in unique_combos:
    #         unique_combos[combo_key] = combo

    generated_count = len(generated_combos)

    print(f"Total generated exclude combinations: {generated_count}")
    # 데이터 확인용으로 맨 위 5개와 맨 아래 5개 출력
    for index, combo in enumerate(generated_combos[:5], start=1):
        print(f"{index:>3}. {combo}")
    if generated_count > 5:
        print("...")
        for index, combo in enumerate(generated_combos[-5:], start=generated_count-4):
            print(f"{index:>3}. {combo}")

    # Save the provided rules to the CSV file
    path = DB_EXCLUDED_COMBINATIONS_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    
    fieldnames = ["function_name", "No1", "No2", "No3", "No4", "No5", "No6"]
    
    try:
        with path.open("w", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            # for combo in generated_combos.values():
            for combo in generated_combos:
                writer.writerow(combo)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write to file: {str(exc)}")

    return {"message": f"Generated {generated_count} exclude rules based on provided rules.", "count": generated_count}

@app.post("/api/lt645/exclude-rules/run")
def run_exclude_rule(body: dict):
    """Run a specific exclusion rule function on draw history."""
    function_name = body.get("function_name")
    if not function_name:
        raise HTTPException(status_code=422, detail="function_name is required")
        
    from my_combinations import run_exclude_rule_on_results
    try:
        excluded = run_exclude_rule_on_results(function_name)
        return {"function_name": function_name, "excluded_count": len(excluded), "rows": excluded}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))




# ---------------------------------------------------------------------------
# Menu 9 – Generate my number combinations
# ---------------------------------------------------------------------------

def _validate_gn_filename(file_name: str) -> str:
    """Return a safe basename for a file under db/gn; raise HTTPException if invalid."""
    name = Path(file_name).name
    if not name or name != file_name or ".." in file_name:
        raise HTTPException(status_code=422, detail=f"Invalid file name: {file_name}")
    if not name.endswith(".csv"):
        raise HTTPException(status_code=422, detail=f"Only CSV files can be deleted: {file_name}")
    return name


@app.get("/api/lt645/generated-files")
def list_generated_files():
    """Return CSV file names from db/gn, newest first."""
    DB_GN_PATH.mkdir(parents=True, exist_ok=True)
    files = sorted(
        (path.name for path in DB_GN_PATH.glob("*.csv") if path.is_file()),
        reverse=True,
    )
    return {"rows": [{"file_name": name} for name in files]}


@app.delete("/api/lt645/generated-files")
def delete_generated_files(body: DeleteGeneratedFilesRequest):
    """Delete selected CSV files from db/gn."""
    deleted: list[str] = []
    errors: list[str] = []

    for raw_name in body.file_names:
        file_name = _validate_gn_filename(raw_name)
        filepath = DB_GN_PATH / file_name
        if not filepath.is_file():
            errors.append(f"File not found: {file_name}")
            continue
        try:
            filepath.unlink()
            deleted.append(file_name)
        except OSError as exc:
            errors.append(f"Failed to delete {file_name}: {exc}")

    if not deleted and errors:
        raise HTTPException(status_code=404, detail="; ".join(errors))

    return {"deleted": deleted, "errors": errors}


@app.post("/api/lt645/generate")
def generate(body: GenerateRequest):
    """Generate random number combinations excluding the excluded list (CLI menu 9)."""
    import csv
    from datetime import datetime

    try:
        result = generate_my_number_combinations(body.count)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # 생성된 번호를 CSV 파일로 저장
    # 파일명에 현재 날짜와 시간을 포함하여 고유하게 생성
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"generate_number_{timestamp}.csv"
    DB_GN_PATH.mkdir(parents=True, exist_ok=True)
    filepath = DB_GN_PATH / filename

    # Write the generated combinations to the CSV file
    fieldnames = ["No", "No1", "No2", "No3", "No4", "No5", "No6"]
    with filepath.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        for idx, combo in enumerate(result, start=1):
            writer.writerow({
                "No": idx,
                "No1": combo[0],
                "No2": combo[1],
                "No3": combo[2],
                "No4": combo[3],
                "No5": combo[4],
                "No6": combo[5],
            })

    print(f"Generated {len(result)} combinations and saved to {filename}")

    return {
        "combinations": [list(combo) for combo in result],
        "saved_file": filename,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
