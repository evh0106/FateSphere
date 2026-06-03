from __future__ import annotations

from common import DB_RESULT_PATH, DOCS_RESULT_PATH, parse_markdown_table


def convert_result_md_to_csv(source=DOCS_RESULT_PATH, target=DB_RESULT_PATH) -> int:
    if not source.exists():
        raise FileNotFoundError(f"source file not found: {source}")

    rows = parse_markdown_table(source.read_text(encoding="utf-8"))
    target.parent.mkdir(parents=True, exist_ok=True)

    if not rows:
        target.write_text("", encoding="utf-8")
        return 0

    import csv

    with target.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)
