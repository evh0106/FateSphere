"""lt645 FastAPI backend

Exposes REST endpoints that the fsWeb frontend (client.ts) consumes.
Run via:  python -m uvicorn backend:app --reload  (from lt645/src)
or use:   lt645/scripts/run_backend.bat
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure sibling modules (common, crawl_results, …) are importable when the
# working directory is not lt645/src.
_SRC_DIR = Path(__file__).resolve().parent
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from common import DB_RESULT_PATH, read_csv_rows
from convert_results import convert_result_md_to_csv
from crawl_results import crawl_new_results, crawl_results_in_range
from my_combinations import (
    generate_my_number_combinations,
    load_excluded_combinations,
    save_excluded_combinations,
)

app = FastAPI(title="lt645 Backend", version="1.0.0")

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
# Request models
# ---------------------------------------------------------------------------

class CrawlRangeRequest(BaseModel):
    startRound: int
    endRound: int


class AddExcludedRequest(BaseModel):
    numbers: list[int]


class GenerateRequest(BaseModel):
    count: int = 5


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/lt645/convert")
def convert_docs():
    """Convert docs/result.md → db/result.csv (CLI menu 2)."""
    try:
        count = convert_result_md_to_csv()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"converted": count}


@app.post("/api/lt645/crawl")
def crawl():
    """Fetch new draw results and append to db/result.csv (CLI menu 3)."""
    count = crawl_new_results()
    return {"crawled": count}


@app.post("/api/lt645/crawl-range")
def crawl_range(body: CrawlRangeRequest):
    """Fetch draws for a specific round range (CLI menu 4)."""
    if body.startRound <= 0 or body.endRound <= 0:
        raise HTTPException(status_code=400, detail="Round values must be positive integers")
    if body.startRound > body.endRound:
        raise HTTPException(status_code=400, detail="startRound must be <= endRound")
    try:
        count = crawl_results_in_range(body.startRound, body.endRound)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"crawled": count}


@app.get("/api/lt645/results")
def get_results(
    startRound: int | None = None,
    endRound: int | None = None,
    limit: int | None = None,
):
    """Return rows from db/result.csv (CLI menu 5)."""
    rows = read_csv_rows(DB_RESULT_PATH)

    if startRound is not None or endRound is not None:
        filtered: list[dict[str, str]] = []
        for row in rows:
            try:
                rnd = int(row.get("Round", 0))
            except ValueError:
                continue
            if startRound is not None and rnd < startRound:
                continue
            if endRound is not None and rnd > endRound:
                continue
            filtered.append(row)
        rows = filtered

    try:
        rows.sort(key=lambda r: int(r.get("Round", 0)), reverse=True)
    except ValueError:
        pass

    if limit is not None:
        rows = rows[:limit]

    result_rows = []
    for row in rows:
        try:
            result_rows.append(
                {
                    "round": int(row["Round"]),
                    "n1": int(row["No1"]),
                    "n2": int(row["No2"]),
                    "n3": int(row["No3"]),
                    "n4": int(row["No4"]),
                    "n5": int(row["No5"]),
                    "n6": int(row["No6"]),
                    "bonus": int(row["Bonus"]),
                }
            )
        except (KeyError, ValueError):
            continue

    return {"rows": result_rows}


@app.get("/api/lt645/excluded")
def get_excluded():
    """Return all excluded number combinations (CLI menu 6 – show)."""
    combos = load_excluded_combinations()
    rows = [
        {"id": _combo_to_id(combo), "numbers": list(combo)}
        for combo in sorted(combos)
    ]
    return {"rows": rows}


@app.post("/api/lt645/excluded", status_code=201)
def add_excluded(body: AddExcludedRequest):
    """Add a new excluded combination (CLI menu 6 – add)."""
    numbers = body.numbers
    if len(numbers) != 6:
        raise HTTPException(status_code=400, detail="Exactly 6 numbers are required")
    if any(n < 1 or n > 45 for n in numbers):
        raise HTTPException(status_code=400, detail="Numbers must be between 1 and 45")
    if len(set(numbers)) != 6:
        raise HTTPException(status_code=400, detail="Numbers must not contain duplicates")

    combo = tuple(sorted(numbers))
    combos = load_excluded_combinations()
    if combo in combos:
        raise HTTPException(status_code=409, detail="Combination already excluded")

    combos.add(combo)
    save_excluded_combinations(combos)
    return {"id": _combo_to_id(combo), "numbers": list(combo)}


@app.delete("/api/lt645/excluded/{combo_id}", status_code=204)
def delete_excluded(combo_id: str):
    """Remove an excluded combination by its ID (CLI menu 6 – remove)."""
    combo = _id_to_combo(combo_id)
    if combo is None:
        raise HTTPException(status_code=400, detail="Invalid combination id")

    combos = load_excluded_combinations()
    if combo not in combos:
        raise HTTPException(status_code=404, detail="Combination not found")

    combos.remove(combo)
    save_excluded_combinations(combos)
    return Response(status_code=204)


@app.post("/api/lt645/generate")
def generate(body: GenerateRequest):
    """Generate random number combinations excluding the excluded list (CLI menu 9)."""
    if body.count <= 0:
        raise HTTPException(status_code=400, detail="count must be a positive integer")
    try:
        generated = generate_my_number_combinations(body.count)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"combinations": [list(combo) for combo in generated]}


# ---------------------------------------------------------------------------
# Entry point for direct execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)
