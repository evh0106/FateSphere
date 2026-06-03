from __future__ import annotations

import csv
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

    # 첫 행만 기준으로 헤더를 만들면 신규 컬럼이 누락될 수 있으므로,
    # 전체 행을 순회하며 등장한 키를 순서대로 수집해 헤더를 구성한다.
    fieldnames: list[str] = []
    seen: set[str] = set()
    for row in row_list:
        for key in row.keys():
            if key not in seen:
                seen.add(key)
                fieldnames.append(key)

    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
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
