from __future__ import annotations

import argparse

from common import DB_RESULT_PATH
from crawl_results import crawl_new_results, crawl_results_in_range
from convert_results import convert_result_md_to_csv
from probabilities import print_probability_report
from show_results import print_csv_table


def run_menu() -> None:
    while True:
        print()
        print("lt645 menu")
        print("1. Show prize probabilities")
        print("2. Convert docs/result.md to db/result.csv")
        print("3. Crawl new lottery results into db/result.csv")
        print("4. Crawl lottery results (range input) into db/result.csv")
        print("5. Print db/result.csv")
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
            start_raw = input("Start round: ").strip()
            end_raw = input("End round: ").strip()

            if not start_raw.isdigit() or not end_raw.isdigit():
                print("Round values must be positive integers")
                continue

            start_round = int(start_raw)
            end_round = int(end_raw)
            if start_round <= 0 or end_round <= 0:
                print("Round values must be positive integers")
                continue

            if start_round > end_round:
                print("Start round must be less than or equal to end round")
                continue

            count = crawl_results_in_range(start_round, end_round)
            print(
                f"Crawled {count} rows from round {start_round} to {end_round} into {DB_RESULT_PATH}"
            )
        elif choice == "5":
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

    crawl_range_parser = subparsers.add_parser(
        "crawl-range",
        help="Fetch draws in the given round range and update db/result.csv",
    )
    crawl_range_parser.add_argument("start_round", type=int, help="Start round (inclusive)")
    crawl_range_parser.add_argument("end_round", type=int, help="End round (inclusive)")

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

    if args.command == "crawl-range":
        if args.start_round <= 0 or args.end_round <= 0:
            print("Round values must be positive integers")
            return 1
        if args.start_round > args.end_round:
            print("Start round must be less than or equal to end round")
            return 1

        count = crawl_results_in_range(args.start_round, args.end_round)
        print(
            f"Crawled {count} rows from round {args.start_round} to {args.end_round} into {DB_RESULT_PATH}"
        )
        return 0

    if args.command == "show":
        print_csv_table(limit=args.limit)
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())