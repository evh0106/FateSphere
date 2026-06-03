from __future__ import annotations

import csv
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCS_RESULT_PATH = PROJECT_ROOT / "docs" / "result.md"
DB_RESULT_PATH = PROJECT_ROOT / "db" / "result.csv"


def parse_markdown_table(text: str) -> list[dict[str, str]]:
    rows: list[list[str]] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            continue
        if set(line.replace("|", "").strip()) <= {"-", ":"}:
            continue

        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if cells:
            rows.append(cells)

    if not rows:
        return []

    header = rows[0]
    parsed_rows: list[dict[str, str]] = []

    for row in rows[1:]:
        if len(row) != len(header):
            continue
        parsed_rows.append(dict(zip(header, row, strict=True)))

    return parsed_rows


def read_csv_rows(path: Path = DB_RESULT_PATH) -> list[dict[str, str]]:
    if not path.exists():
        return []

    with path.open(encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        return list(reader)


def write_csv_rows(rows: Iterable[dict[str, str]], path: Path = DB_RESULT_PATH) -> int:
    row_list = list(rows)
    path.parent.mkdir(parents=True, exist_ok=True)

    if not row_list:
        path.write_text("", encoding="utf-8")
        return 0

    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=list(row_list[0].keys()))
        writer.writeheader()
        writer.writerows(row_list)

    return len(row_list)


def print_csv_table(path: Path = DB_RESULT_PATH, limit: int | None = None) -> None:
    rows = read_csv_rows(path)
    if not rows:
        print(f"No CSV data found at {path}")
        return

    if limit is not None:
        rows = rows[:limit]

    headers = list(rows[0].keys())
    widths = {header: len(header) for header in headers}
    for row in rows:
        for header in headers:
            widths[header] = max(widths[header], len(row.get(header, "")))

    header_line = " | ".join(header.ljust(widths[header]) for header in headers)
    separator_line = "-+-".join("-" * widths[header] for header in headers)
    print(header_line)
    print(separator_line)
    for row in rows:
        print(" | ".join(row.get(header, "").ljust(widths[header]) for header in headers))


def fetch_lotto_draw(round_no: int) -> dict[str, str] | None:
    url = f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round_no}"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    if payload.get("returnValue") != "success":
        return None

    return {
        "Round": str(payload["drwNo"]),
        "No1": str(payload["drwtNo1"]),
        "No2": str(payload["drwtNo2"]),
        "No3": str(payload["drwtNo3"]),
        "No4": str(payload["drwtNo4"]),
        "No5": str(payload["drwtNo5"]),
        "No6": str(payload["drwtNo6"]),
        "Bonus": str(payload["bnusNo"]),
        "FirstPrize": str(payload["firstWinamnt"]),
        "FirstWinners": str(payload["firstPrzwnerCo"]),
        "SecondPrize": str(payload["secondWinamnt"]),
        "SecondWinners": str(payload["secondPrzwnerCo"]),
    }
