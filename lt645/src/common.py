from __future__ import annotations

import csv
from pathlib import Path
from typing import Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCS_RESULT_PATH = PROJECT_ROOT / "docs" / "result.md"
DB_RESULT_PATH = PROJECT_ROOT / "db" / "result.csv"
DB_EXCLUDED_COMBINATIONS_PATH = PROJECT_ROOT / "db" / "excluded_combinations.csv"


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

    # 전체 행에서 키를 수집하고, 알려진 컬럼은 고정 순서로 정렬한다.
    discovered: list[str] = []
    seen: set[str] = set()
    for row in row_list:
        for key in row.keys():
            if key not in seen:
                seen.add(key)
                discovered.append(key)

    preferred_order = [
        "Round",
        "No1",
        "No2",
        "No3",
        "No4",
        "No5",
        "No6",
        "Bonus",
        "FirstPrize",
        "FirstWinners",
        "SecondPrize",
        "SecondWinners",
        "ThirdPrize",
        "ThirdWinners",
        "FourthWinners",
        "FifthWinners",
    ]

    ordered_known = [key for key in preferred_order if key in seen]
    ordered_extra = [key for key in discovered if key not in preferred_order]
    fieldnames = ordered_known + ordered_extra

    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(row_list)

    return len(row_list)


def print_csv_table(
    path: Path = DB_RESULT_PATH,
    limit: int | None = None,
    start_round: int | None = None,
    end_round: int | None = None,
    latest: bool = False,
    sort_desc: bool = False,
) -> None:
    rows = read_csv_rows(path)
    if not rows:
        print(f"No CSV data found at {path}")
        return

    if start_round is not None or end_round is not None:
        filtered_rows: list[dict[str, str]] = []
        for row in rows:
            try:
                round_no = int(row.get("Round", 0))
            except ValueError:
                continue

            if start_round is not None and round_no < start_round:
                continue
            if end_round is not None and round_no > end_round:
                continue
            filtered_rows.append(row)
        rows = filtered_rows

    if sort_desc:
        try:
            rows.sort(key=lambda row: int(row.get("Round", 0)), reverse=True)
        except ValueError:
            # Round 값이 비정상인 행이 있으면 원래 순서를 유지한다.
            pass

    if limit is not None:
        if latest:
            rows = rows[:limit] if sort_desc else rows[-limit:]
        else:
            rows = rows[:limit]

    if not rows:
        print("No rows to display")
        return

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
