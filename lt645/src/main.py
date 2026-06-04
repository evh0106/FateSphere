from __future__ import annotations

import argparse

from common import DB_RESULT_PATH
from crawl_results import crawl_new_results, crawl_results_in_range
from convert_results import convert_result_md_to_csv
from my_combinations import (
    generate_my_number_combinations,
    manage_excluded_number_combinations,
    run_generate_my_number_combinations,
)
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
        print("5. Print db/result.csv (default: latest 10, optional round range)")
        print("6. Managing Excluded Number Combinations")
        print("9. Generate my number combinations")
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
            start_raw = input("Start round (Enter = latest 10): ").strip()
            end_raw = input("End round (Enter = latest 10): ").strip()

            if not start_raw and not end_raw:
                print_csv_table(limit=10, latest=True, sort_desc=True)
                continue

            if not start_raw or not end_raw:
                print("To set a range, both start and end rounds are required")
                continue

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

            print_csv_table(start_round=start_round, end_round=end_round, sort_desc=True)
        elif choice == "6":
            manage_excluded_number_combinations()
        elif choice == "9":
            run_generate_my_number_combinations()
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
    show_parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Limit the number of rows displayed (default: 10 latest rows)",
    )
    show_parser.add_argument("--start-round", type=int, default=None, help="Start round (inclusive)")
    show_parser.add_argument("--end-round", type=int, default=None, help="End round (inclusive)")

    generate_parser = subparsers.add_parser(
        "generate",
        help="Generate my number combinations",
    )
    generate_parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of combinations to generate (default: 5)",
    )

    subparsers.add_parser(
        "manage-excluded",
        help="Manage excluded number combinations",
    )

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
        if args.start_round is not None or args.end_round is not None:
            if args.start_round is None or args.end_round is None:
                print("When using round range, both --start-round and --end-round are required")
                return 1
            if args.start_round <= 0 or args.end_round <= 0:
                print("Round values must be positive integers")
                return 1
            if args.start_round > args.end_round:
                print("Start round must be less than or equal to end round")
                return 1

            print_csv_table(start_round=args.start_round, end_round=args.end_round, sort_desc=True)
            return 0

        if args.limit is not None and args.limit <= 0:
            print("Limit must be a positive integer")
            return 1

        print_csv_table(limit=args.limit, latest=True, sort_desc=True)
        return 0

    if args.command == "manage-excluded":
        manage_excluded_number_combinations()
        return 0

    if args.command == "generate":
        if args.count <= 0:
            print("Count must be a positive integer")
            return 1

        try:
            generated = generate_my_number_combinations(args.count)
        except (ValueError, RuntimeError) as exc:
            print(str(exc))
            return 1

        print("Generated my number combinations:")
        for index, combo in enumerate(generated, start=1):
            print(f"{index:>3}. {' '.join(f'{number:02d}' for number in combo)}")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())