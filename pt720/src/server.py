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
import csv
from datetime import datetime

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


@app.post("/api/pt720/exclude-rules", status_code=201)
def add_exclude_rule(req: AddExcludeRuleRequest):
    rule_name = req.rule_name.strip()
    function_name = req.function_name.strip()

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
        raise HTTPException(status_code=500, detail=f"Failed to write to file: {str(exc)}") from exc

    return {
        "message": "Exclude rule saved successfully",
        "rule_name": rule_name,
        "function_name": function_name,
        "start_round": "1",
        "end_round": "",
        "updated_at": updated_at,
        "is_active": "Y",
    }


@app.get("/api/pt720/exclude-rules")
def list_exclude_rules():
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
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(exc)}") from exc

    return {"rows": rows}


@app.put("/api/pt720/exclude-rules")
def save_exclude_rules(req: SaveExcludeRulesRequest):
    path = DB_EXCLUDE_RULES_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = ["rule_name", "function_name", "start_round", "end_round", "updated_at", "is_active"]
    try:
        with path.open("w", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            for rule in req.rules:
                writer.writerow({
                    "rule_name": rule.rule_name,
                    "function_name": rule.function_name,
                    "start_round": rule.start_round,
                    "end_round": rule.end_round,
                    "updated_at": rule.updated_at,
                    "is_active": rule.is_active,
                })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write to file: {str(exc)}") from exc

    return {"message": "Exclude rules saved successfully", "count": len(req.rules)}
