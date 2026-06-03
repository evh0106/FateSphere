from __future__ import annotations

import argparse
import csv
import json
import math
import sys
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
    data_rows = rows[1:]
    parsed_rows: list[dict[str, str]] = []

    for row in data_rows:
        if len(row) != len(header):
            continue
        parsed_rows.append(dict(zip(header, row, strict=True)))

    return parsed_rows


def convert_result_md_to_csv(source: Path = DOCS_RESULT_PATH, target: Path = DB_RESULT_PATH) -> int:
    if not source.exists():
        raise FileNotFoundError(f"source file not found: {source}")

    rows = parse_markdown_table(source.read_text(encoding="utf-8"))
    target.parent.mkdir(parents=True, exist_ok=True)

    if not rows:
        target.write_text("", encoding="utf-8")
        return 0

    with target.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)


def calculate_prize_probabilities() -> list[dict[str, str]]:
    """1등부터 5등까지의 당첨 확률과 경우의 수를 계산한다.

    전체 경우의 수는 45개 번호 중 6개를 고르는 조합으로 계산하고,
    각 등수는 해당 조건을 만족하는 조합의 개수와 전체 경우의 수를 비교해
    확률과 '1 in N' 형식의 당첨 가능성으로 변환한다.

    combinations=6: 2등에 해당하는 경우의 수가 6개라는 뜻입니다. 즉, 보너스 번호를 포함해 딱 5개 숫자가 맞는 조합이 6가지 있다는 의미.
    """

    total_tickets = math.comb(45, 6)
    prize_counts = {
        "1st Place": math.comb(6, 6) * math.comb(39, 0),
        "2nd Place": math.comb(6, 5) * math.comb(1, 1),
        "3rd Place": math.comb(6, 5) * math.comb(38, 1),
        "4th Place": math.comb(6, 4) * math.comb(39, 2),
        "5th Place": math.comb(6, 3) * math.comb(39, 3),
    }

    results: list[dict[str, str]] = []
    for place, count in prize_counts.items():
        probability = count / total_tickets
        results.append(
            {
                "place": place,
                "count": str(count),
                "probability": f"{probability:.10%}",
                "odds": f"1 in {round(1 / probability):,}",
            }
        )

    return results


def print_probability_report() -> None:
    print("Lottery prize probabilities")
    print("-" * 72)
    for item in calculate_prize_probabilities():
        print(f"{item['place']:<12} {item['probability']:>14}  {item['odds']:>18}  combinations={item['count']}")


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


def crawl_new_results(csv_path: Path = DB_RESULT_PATH) -> int:
    existing_rows = read_csv_rows(csv_path)
    latest_round = 0

    if existing_rows:
        try:
            latest_round = max(int(row.get("Round", 0)) for row in existing_rows)
        except ValueError:
            latest_round = 0

    new_rows: list[dict[str, str]] = []
    next_round = latest_round + 1

    while True:
        draw = fetch_lotto_draw(next_round)
        if draw is None:
            break
        new_rows.append(draw)
        next_round += 1

    if not new_rows:
        return 0

    merged_rows = existing_rows + new_rows
    merged_rows.sort(key=lambda row: int(row.get("Round", 0)))
    write_csv_rows(merged_rows, csv_path)
    return len(new_rows)


def run_menu() -> None:
    while True:
        print()
        print("lt645 menu")
        print("1. Show prize probabilities")
        print("2. Convert docs/result.md to db/result.csv")
        print("3. Crawl new lottery results into db/result.csv")
        print("4. Print db/result.csv")
        print("0. Exit")

        choice = input("Select an option: ").strip()

        if choice == "1":
            print_probability_report()
        elif choice == "2":
            count = convert_result_md_to_csv()
            print(f"Converted {count} rows to {DB_RESULT_PATH}")
        elif choice == "3":
            count = crawl_new_results()
            print(f"Crawled {count} new rows into {DB_RESULT_PATH}")
        elif choice == "4":
            print_csv_table()
        elif choice == "0":
            return
        else:
            print("Invalid choice")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="lt645 lottery utility")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("menu", help="Open the interactive menu")
    subparsers.add_parser("probabilities", help="Print prize probabilities")
    subparsers.add_parser("convert", help="Convert docs/result.md to db/result.csv")
    subparsers.add_parser("crawl", help="Fetch new draws and append them to db/result.csv")

    show_parser = subparsers.add_parser("show", help="Print db/result.csv")
    show_parser.add_argument("--limit", type=int, default=None, help="Limit the number of rows displayed")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command is None or args.command == "menu":
        run_menu()
        return 0

    if args.command == "probabilities":
        print_probability_report()
        return 0

    if args.command == "convert":
        count = convert_result_md_to_csv()
        print(f"Converted {count} rows to {DB_RESULT_PATH}")
        return 0

    if args.command == "crawl":
        count = crawl_new_results()
        print(f"Crawled {count} new rows into {DB_RESULT_PATH}")
        return 0

    if args.command == "show":
        print_csv_table(limit=args.limit)
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())