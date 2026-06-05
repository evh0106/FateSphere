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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from common import DB_EXCLUDED_COMBINATIONS_PATH, read_csv_rows
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
# Menu 2 – Convert docs/result.md → db/result.csv
# ---------------------------------------------------------------------------

@app.post("/api/lt645/convert")
def convert():
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
    count = crawl_new_results()
    return {"crawled": count}


# ---------------------------------------------------------------------------
# Menu 4 – Crawl results by round range
# ---------------------------------------------------------------------------

class CrawlRangeRequest(BaseModel):
    startRound: int = Field(gt=0)
    endRound: int = Field(gt=0)


@app.post("/api/lt645/crawl-range")
def crawl_range(body: CrawlRangeRequest):
    if body.startRound > body.endRound:
        raise HTTPException(
            status_code=422,
            detail="startRound must be less than or equal to endRound",
        )
    count = crawl_results_in_range(body.startRound, body.endRound)
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


def _combos_to_response(combos: set[tuple[int, ...]]) -> list[ExcludedCombination]:
    result: list[ExcludedCombination] = []
    for combo in sorted(combos):
        combo_id = "-".join(str(n) for n in combo)
        result.append(ExcludedCombination(id=combo_id, numbers=list(combo)))
    return result


@app.get("/api/lt645/excluded")
def list_excluded():
    combos = load_excluded_combinations()
    return {"rows": _combos_to_response(combos)}


class AddExcludedRequest(BaseModel):
    numbers: list[int]


@app.post("/api/lt645/excluded", status_code=201)
def add_excluded(body: AddExcludedRequest):
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

    combo_id = "-".join(str(n) for n in combo)
    return ExcludedCombination(id=combo_id, numbers=list(combo))


@app.delete("/api/lt645/excluded/{combo_id}", status_code=204)
def delete_excluded(combo_id: str):
    try:
        numbers = [int(p) for p in combo_id.split("-")]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid combination id") from exc

    if len(numbers) != 6:
        raise HTTPException(status_code=422, detail="Combination id must encode 6 numbers")

    combo = tuple(sorted(numbers))
    combos = load_excluded_combinations()
    if combo not in combos:
        raise HTTPException(status_code=404, detail="Combination not found")

    combos.remove(combo)
    save_excluded_combinations(combos)


# ---------------------------------------------------------------------------
# Menu 9 – Generate my number combinations
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    count: int = Field(default=5, gt=0)


@app.post("/api/lt645/generate")
def generate(body: GenerateRequest):
    try:
        result = generate_my_number_combinations(body.count)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"combinations": [list(combo) for combo in result]}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
