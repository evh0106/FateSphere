from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
import re

from common import DB_RESULT_PATH, read_csv_rows, write_csv_rows

def fetch_pt720_draw(round_no: int) -> dict[str, str] | None:
    # URL targeting the Pension Lottery 720+ results page
    url = f"https://www.dhlottery.co.kr/gameResult.do?method=win720&Round={round_no}"

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except Exception:
        return None

    # Verify if the round in page matches the requested round
    round_match = re.search(r'id="drwNo720">(\d+)</strong>', html)
    if not round_match or int(round_match.group(1)) != round_no:
        return None

    # Parse 1st prize and bonus prize digits
    # The numbers are usually listed inside <div class="win720_num"> ... <span>X조</span> ... <span>Y</span>
    blocks = re.findall(r'<div class="win720_num">.*?</div>\s*</div>', html, re.DOTALL)
    if len(blocks) < 2:
        blocks = re.findall(r'<div class="win720_num">.*?</div>', html, re.DOTALL)

    def extract_digits(block_html: str) -> list[str]:
        spans = re.findall(r'<span>([0-9]조?)</span>', block_html)
        if not spans:
            spans = re.findall(r'alt="([0-9]조?)"', block_html)
        if not spans:
            spans = re.findall(r'<span[^>]*>\s*([0-9]조?)\s*</span>', block_html)
        return [s.replace("조", "") for s in spans]

    digits_1st = []
    digits_bonus = []

    if len(blocks) >= 2:
        digits_1st = extract_digits(blocks[0])
        digits_bonus = extract_digits(blocks[1])

    # Fallback to global image alt search if block parsing failed
    if len(digits_1st) < 7 or len(digits_bonus) < 6:
        all_alts = re.findall(r'alt="([0-9]조?)"', html)
        if len(all_alts) >= 13:
            digits_1st = all_alts[:7]
            digits_bonus = all_alts[7:13]
        else:
            return None

    group = digits_1st[0].replace("조", "")
    no_digits = [d.replace("조", "") for d in digits_1st[1:7]]
    bonus_digits = [d.replace("조", "") for d in digits_bonus[:6]]

    return {
        "Round": str(round_no),
        "Group": group,
        "No1": no_digits[0],
        "No2": no_digits[1],
        "No3": no_digits[2],
        "No4": no_digits[3],
        "No5": no_digits[4],
        "No6": no_digits[5],
        "Bonus1": bonus_digits[0],
        "Bonus2": bonus_digits[1],
        "Bonus3": bonus_digits[2],
        "Bonus4": bonus_digits[3],
        "Bonus5": bonus_digits[4],
        "Bonus6": bonus_digits[5]
    }

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

    new_rows: list[dict[str, str]] = []
    next_round = latest_round + 1
    last_checked_round: int | None = None

    while True:
        last_checked_round = next_round
        draw = fetch_pt720_draw(next_round)
        if draw is None:
            break
        new_rows.append(draw)
        next_round += 1

    if last_checked_round is not None:
        print(f"Last crawled target round: {last_checked_round}")

    if not new_rows:
        previous_draw: dict[str, str] | None = None
        if last_checked_round is not None and last_checked_round > 1:
            previous_draw = fetch_pt720_draw(last_checked_round - 1)

        print("No new rows found, but the crawl target was checked.")
        if previous_draw is not None:
            print("Previous round data:")
            print_rows_table([previous_draw])
        else:
            print("Previous round data is not available.")
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

    existing_rows = read_csv_rows(csv_path)
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
