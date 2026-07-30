"""
pt720 FastAPI backend server.
Provides REST endpoints that mirror the CLI menu actions.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add src/ directory to the Python path
_SRC = Path(__file__).resolve().parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from typing import Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from common import DB_RESULT_PATH, DB_EXCLUDED_COMBINATIONS_PATH, DB_EXCLUDE_RULES_PATH, read_csv_rows
from convert_results import convert_result_md_to_csv
from crawl_results import crawl_new_results, crawl_results_in_range
from my_combinations import (
    generate_my_number_combinations,
    load_excluded_combinations,
    save_excluded_combinations,
)

app = FastAPI(title="pt720 API", version="1.0.0")

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
    return "-".join(str(n) for n in combo)


def _id_to_combo(combo_id: str) -> tuple[int, ...] | None:
    try:
        parts = [int(x) for x in combo_id.split("-")]
    except ValueError:
        return None
    if len(parts) != 7:
        return None
    return tuple(parts)


# ---------------------------------------------------------------------------
# Result rows
# ---------------------------------------------------------------------------

class ResultRow(BaseModel):
    round: int
    group: int
    n1: int
    n2: int
    n3: int
    n4: int
    n5: int
    n6: int
    bonus: str


def _csv_row_to_result(row: dict[str, str]) -> ResultRow | None:
    try:
        return ResultRow(
            round=int(row["Round"]),
            group=int(row["Group"]),
            n1=int(row["No1"]),
            n2=int(row["No2"]),
            n3=int(row["No3"]),
            n4=int(row["No4"]),
            n5=int(row["No5"]),
            n6=int(row["No6"]),
            bonus="".join(
                [
                    row["BNo1"],
                    row["BNo2"],
                    row["BNo3"],
                    row["BNo4"],
                    row["BNo5"],
                    row["BNo6"],
                ]
            ),
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
    numbers: list[int]  # [group, d1, d2, d3, d4, d5, d6]


class GenerateRequest(BaseModel):
    count: int = Field(default=5, gt=0)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/pt720/convert")
def convert():
    try:
        count = convert_result_md_to_csv()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"converted": count}


@app.post("/api/pt720/crawl")
def crawl():
    try:
        count = crawl_new_results()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"crawled": count}


@app.post("/api/pt720/crawl-range")
def crawl_range(req: CrawlRangeRequest):
    try:
        count = crawl_results_in_range(req.startRound, req.endRound)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"crawled": count}


@app.get("/api/pt720/results")
def get_results(
    startRound: Optional[int] = None,
    endRound: Optional[int] = None,
    limit: Optional[int] = None,
):
    rows = read_csv_rows(DB_RESULT_PATH)
    results: list[ResultRow] = []

    for r in rows:
        parsed = _csv_row_to_result(r)
        if parsed:
            results.append(parsed)

    results.sort(key=lambda x: x.round, reverse=True)

    if startRound is not None or endRound is not None:
        filtered: list[ResultRow] = []
        for res in results:
            if startRound is not None and res.round < startRound:
                continue
            if endRound is not None and res.round > endRound:
                continue
            filtered.append(res)
        results = filtered

    if limit is not None and limit > 0:
        results = results[:limit]

    return {"rows": results}


@app.get("/api/pt720/excluded")
def get_excluded():
    combos = load_excluded_combinations()
    rows = []
    for c in sorted(combos):
        rows.append({
            "id": _combo_to_id(c),
            "numbers": list(c),
        })
    return {"rows": rows}


@app.post("/api/pt720/excluded")
def add_excluded(req: AddExcludedRequest):
    if len(req.numbers) != 7:
        raise HTTPException(status_code=400, detail="Must provide exactly 7 numbers (Group + 6 digits)")

    combo = tuple(req.numbers)
    if combo[0] < 1 or combo[0] > 5:
        raise HTTPException(status_code=400, detail="Group must be between 1 and 5")
    if any(digit < 0 or digit > 9 for digit in combo[1:]):
        raise HTTPException(status_code=400, detail="Digits must be between 0 and 9")

    combos = load_excluded_combinations()
    if combo in combos:
        raise HTTPException(status_code=400, detail="Combination already exists in excluded list")

    combos.add(combo)
    save_excluded_combinations(combos)

    return {
        "id": _combo_to_id(combo),
        "numbers": list(combo),
    }


@app.delete("/api/pt720/excluded/{combo_id}")
def delete_excluded(combo_id: str):
    combo = _id_to_combo(combo_id)
    if not combo:
        raise HTTPException(status_code=400, detail="Invalid combination ID format")

    combos = load_excluded_combinations()
    if combo not in combos:
        raise HTTPException(status_code=404, detail="Combination not found in excluded list")

    combos.remove(combo)
    save_excluded_combinations(combos)
    return Response(status_code=204)


@app.post("/api/pt720/generate")
def generate(req: GenerateRequest):
    try:
        combos = generate_my_number_combinations(req.count)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "combinations": [list(c) for c in combos]
    }
