from __future__ import annotations

import json
import urllib.request

from common import DB_RESULT_PATH, read_csv_rows, write_csv_rows

PT720_RESULTS_URL = "https://www.dhlottery.co.kr/pt720/selectPstPt720WnList.do"

def _fetch_pt720_result_items() -> list[dict[str, object]] | None:
    request = urllib.request.Request(
        PT720_RESULTS_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.dhlottery.co.kr/pt720/result",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8", errors="ignore"))
    except Exception:
        return None

    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return None

    result = data.get("result")
    if not isinstance(result, list):
        return None

    items: list[dict[str, object]] = []
    for item in result:
        if isinstance(item, dict):
            items.append(item)

    items.sort(key=lambda item: int(item.get("psltEpsd", 0)), reverse=True)
    return items

def _record_to_csv_row(item: dict[str, object]) -> dict[str, str] | None:
    try:
        round_no = int(item["psltEpsd"])
        group = str(item["wnBndNo"])
        winning_digits = str(item["wnRnkVl"])
        bonus_digits = str(item["bnsRnkVl"])
    except (KeyError, TypeError, ValueError):
        return None

    if len(winning_digits) != 6 or len(bonus_digits) != 6:
        return None

    return {
        "Round": str(round_no),
        "Group": group,
        "No1": winning_digits[0],
        "No2": winning_digits[1],
        "No3": winning_digits[2],
        "No4": winning_digits[3],
        "No5": winning_digits[4],
        "No6": winning_digits[5],
        "BNo1": bonus_digits[0],
        "BNo2": bonus_digits[1],
        "BNo3": bonus_digits[2],
        "BNo4": bonus_digits[3],
        "BNo5": bonus_digits[4],
        "BNo6": bonus_digits[5],
    }

def _strip_bonus_columns(row: dict[str, str]) -> dict[str, str]:
    return {
        key: value
        for key, value in row.items()
        if key not in {"Bonus1", "Bonus2", "Bonus3", "Bonus4", "Bonus5", "Bonus6"}
    }

def fetch_pt720_draw(round_no: int) -> dict[str, str] | None:
    items = _fetch_pt720_result_items()
    if items is None:
        return None

    for item in items:
        draw = _record_to_csv_row(item)
        if draw is None:
            continue
        if int(draw.get("Round", "0")) == round_no:
            return draw

    return None

def fetch_latest_pt720_draw() -> dict[str, str] | None:
    items = _fetch_pt720_result_items()
    if not items:
        return None

    return _record_to_csv_row(items[0])

def print_rows_table(rows: list[dict[str, str]]) -> None:
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

def crawl_new_results(csv_path=DB_RESULT_PATH) -> int:
    existing_rows = read_csv_rows(csv_path)
    latest_round = 0

    if existing_rows:
        try:
            latest_round = max(int(row.get("Round", 0)) for row in existing_rows)
        except ValueError:
            latest_round = 0

    existing_rows = [_strip_bonus_columns(row) for row in existing_rows]

    items = _fetch_pt720_result_items()
    if items is None:
        print("No draw data could be parsed from the pt720 result API.")
        return 0

    latest_item_round = int(items[0].get("psltEpsd", 0))
    print(f"Latest round on page: {latest_item_round}")

    new_rows: list[dict[str, str]] = []
    for item in items:
        draw = _record_to_csv_row(item)
        if draw is None:
            continue
        if int(draw.get("Round", "0")) > latest_round:
            new_rows.append(draw)

    new_rows.sort(key=lambda row: int(row.get("Round", 0)))

    if not new_rows:
        print("No new rows found, but the latest result page was checked.")
        if existing_rows:
            write_csv_rows(existing_rows, csv_path)
        return 0

    print("Crawled rows before saving:")
    print_rows_table(new_rows)

    merged_rows = existing_rows + new_rows
    merged_rows.sort(key=lambda row: int(row.get("Round", 0)))
    write_csv_rows(merged_rows, csv_path)

    return len(new_rows)

def crawl_results_in_range(start_round: int, end_round: int, csv_path=DB_RESULT_PATH) -> int:
    if start_round > end_round:
        raise ValueError("start_round must be less than or equal to end_round")

    existing_rows = [_strip_bonus_columns(row) for row in read_csv_rows(csv_path)]
    crawled_rows: list[dict[str, str]] = []
    missing_rounds: list[int] = []

    for round_no in range(start_round, end_round + 1):
        draw = fetch_pt720_draw(round_no)
        if draw is None:
            missing_rounds.append(round_no)
            continue
        crawled_rows.append(draw)

    print(f"Crawl target range: {start_round} to {end_round}")
    if crawled_rows:
        print("Crawled rows before saving:")
        print_rows_table(crawled_rows)
    else:
        print("No rows found in the requested range.")

    if missing_rounds:
        print("Missing round data:", ", ".join(str(round_no) for round_no in missing_rounds))

    if not crawled_rows:
        return 0

    merged_by_round: dict[str, dict[str, str]] = {}
    for row in existing_rows:
        round_key = row.get("Round", "")
        if round_key:
            merged_by_round[round_key] = row

    for row in crawled_rows:
        merged_by_round[row["Round"]] = row

    merged_rows = list(merged_by_round.values())
    merged_rows.sort(key=lambda row: int(row.get("Round", 0)))
    write_csv_rows(merged_rows, csv_path)

    return len(crawled_rows)
