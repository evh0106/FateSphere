from __future__ import annotations

import csv
import random
from pathlib import Path

from common import DB_EXCLUDED_COMBINATIONS_PATH


def _parse_six_numbers(raw: str) -> tuple[int, ...]:
    # 사용자 입력 문자열을 6개 번호 조합으로 파싱하고 유효성을 검증한다.
    cleaned = raw.replace(",", " ").strip()
    parts = [token for token in cleaned.split() if token]
    if len(parts) != 6:
        raise ValueError("You must enter exactly 6 numbers")

    try:
        values = [int(token) for token in parts]
    except ValueError as exc:
        raise ValueError("All values must be integers") from exc

    if any(value < 1 or value > 45 for value in values):
        raise ValueError("Numbers must be between 1 and 45")

    if len(set(values)) != 6:
        raise ValueError("Numbers must not contain duplicates")

    return tuple(sorted(values))


def _format_combination(combo: tuple[int, ...]) -> str:
    # 조합을 고정 폭(2자리) 문자열로 출력하기 위한 포맷으로 변환한다.
    return " ".join(f"{number:02d}" for number in combo)


def load_excluded_combinations(
    path: Path = DB_EXCLUDED_COMBINATIONS_PATH,
) -> set[tuple[int, ...]]:
    # 제외 조합 CSV를 읽어 정렬된 6개 번호 튜플 집합으로 반환한다.
    if not path.exists():
        return set()

    combos: set[tuple[int, ...]] = set()
    with path.open(encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            values: list[int] = []
            try:
                for index in range(1, 7):
                    values.append(int(row.get(f"No{index}", "0")))
            except ValueError:
                continue

            if any(value < 1 or value > 45 for value in values):
                continue
            if len(set(values)) != 6:
                continue

            combos.add(tuple(sorted(values)))

    return combos


def save_excluded_combinations(
    combos: set[tuple[int, ...]],
    path: Path = DB_EXCLUDED_COMBINATIONS_PATH,
) -> int:
    # 제외 조합 집합을 CSV 파일로 저장하고 저장 건수를 반환한다.
    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(combos)

    with path.open("w", encoding="utf-8", newline="") as csv_file:
        fieldnames = [f"No{index}" for index in range(1, 7)]
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for combo in ordered:
            row = {f"No{index}": value for index, value in enumerate(combo, start=1)}
            writer.writerow(row)

    return len(ordered)


def _print_excluded_combinations(combos: set[tuple[int, ...]]) -> None:
    # 제외 목록을 사람이 읽기 쉬운 형태로 콘솔에 출력한다.
    if not combos:
        print("No excluded combinations.")
        return

    print("Excluded combinations:")
    for index, combo in enumerate(sorted(combos), start=1):
        print(f"{index:>3}. {_format_combination(combo)}")


def manage_excluded_number_combinations() -> None:
    # 제외 조합을 조회/추가/삭제/전체삭제할 수 있는 인터랙티브 메뉴를 제공한다.
    combos = load_excluded_combinations()

    while True:
        print()
        print("Manage Excluded Number Combinations")
        print("1. Show excluded combinations")
        print("2. Add excluded combination")
        print("3. Remove excluded combination")
        print("4. Clear all excluded combinations")
        print("0. Back")

        choice = input("Select an option: ").strip()

        if choice == "1":
            _print_excluded_combinations(combos)
            continue

        if choice == "2":
            raw = input("Enter 6 numbers (e.g. 1 2 3 4 5 6): ").strip()
            try:
                combo = _parse_six_numbers(raw)
            except ValueError as exc:
                print(str(exc))
                continue

            if combo in combos:
                print("This combination is already excluded.")
                continue

            combos.add(combo)
            save_excluded_combinations(combos)
            print(f"Added: {_format_combination(combo)}")
            continue

        if choice == "3":
            raw = input("Enter 6 numbers to remove: ").strip()
            try:
                combo = _parse_six_numbers(raw)
            except ValueError as exc:
                print(str(exc))
                continue

            if combo not in combos:
                print("This combination is not in the excluded list.")
                continue

            combos.remove(combo)
            save_excluded_combinations(combos)
            print(f"Removed: {_format_combination(combo)}")
            continue

        if choice == "4":
            confirm = input("Type YES to clear all: ").strip()
            if confirm != "YES":
                print("Cancelled")
                continue

            combos.clear()
            save_excluded_combinations(combos)
            print("All excluded combinations are cleared.")
            continue

        if choice == "0":
            return

        print("Invalid choice")


def generate_my_number_combinations(count: int) -> list[tuple[int, ...]]:
    # 제외 목록을 반영해 중복 없는 번호 조합을 원하는 개수만큼 생성한다.
    if count <= 0:
        raise ValueError("count must be a positive integer")

    excluded = load_excluded_combinations()
    generated: set[tuple[int, ...]] = set()

    # 45C6 = 8,145,060
    max_possible = 8145060 - len(excluded)
    if count > max_possible:
        raise ValueError("Requested count exceeds available combinations")

    attempts = 0
    max_attempts = max(1000, count * 50)

    while len(generated) < count and attempts < max_attempts:
        combo = tuple(sorted(random.sample(range(1, 46), 6)))
        attempts += 1

        if combo in excluded:
            continue
        generated.add(combo)

    if len(generated) < count:
        raise RuntimeError("Could not generate enough unique combinations")

    return sorted(generated)


def run_generate_my_number_combinations() -> None:
    # 사용자 입력으로 생성 개수를 받아 조합 생성 결과를 콘솔에 출력한다.
    raw = input("How many combinations to generate? (default: 5): ").strip()
    if not raw:
        count = 5
    elif raw.isdigit() and int(raw) > 0:
        count = int(raw)
    else:
        print("Count must be a positive integer")
        return

    try:
        generated = generate_my_number_combinations(count)
    except (ValueError, RuntimeError) as exc:
        print(str(exc))
        return

    print("Generated my number combinations:")
    for index, combo in enumerate(generated, start=1):
        print(f"{index:>3}. {_format_combination(combo)}")


# Sample exclusion functions
def exclude_all_odds(combo: tuple[int, ...]) -> bool:
    """Returns True if all numbers in the combination are odd."""
    return all(n % 2 != 0 for n in combo)


def exclude_all_evens(combo: tuple[int, ...]) -> bool:
    """Returns True if all numbers in the combination are even."""
    return all(n % 2 == 0 for n in combo)


def exclude_sequential(combo: tuple[int, ...]) -> bool:
    """Returns True if there are 3 or more consecutive numbers."""
    s = sorted(combo)
    for i in range(len(s) - 2):
        if s[i+1] == s[i] + 1 and s[i+2] == s[i] + 2:
            return True
    return False


def run_exclude_rule_on_results(function_name: str) -> list[dict]:
    """
    Runs the exclusion function specified by function_name against all results
    in db/result.csv. Returns a list of excluded draw results.
    """
    # Map function name to actual python function
    func_map = {
        "exclude_all_odds": exclude_all_odds,
        "exclude_all_evens": exclude_all_evens,
        "exclude_sequential": exclude_sequential,
    }
    
    func = func_map.get(function_name)
    if not func:
        # If dynamic lookup is preferred, try to find it in globals
        func = globals().get(function_name)
        
    if not func:
        raise ValueError(f"Function '{function_name}' is not defined in lt645 rules.")

    from common import read_csv_rows
    rows = read_csv_rows()
    excluded_draws = []

    for r in rows:
        try:
            combo = (
                int(r["No1"]),
                int(r["No2"]),
                int(r["No3"]),
                int(r["No4"]),
                int(r["No5"]),
                int(r["No6"]),
            )
            if func(combo):
                excluded_draws.append({
                    "round": int(r["Round"]),
                    "numbers": list(combo),
                    "bonus": int(r["Bonus"]),
                    "draw_date": r.get("DrawDate") or r.get("draw_date") or ""
                })
        except (KeyError, ValueError):
            continue

    # Sort by round descending
    excluded_draws.sort(key=lambda x: x["round"], reverse=True)
    return excluded_draws

