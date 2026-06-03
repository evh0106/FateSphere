from __future__ import annotations

from common import DB_RESULT_PATH, fetch_lotto_draw, read_csv_rows, write_csv_rows


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
