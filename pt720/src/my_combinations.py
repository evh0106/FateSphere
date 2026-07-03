from __future__ import annotations

import csv
import random
from pathlib import Path

from common import DB_EXCLUDED_COMBINATIONS_PATH, DB_EXCLUDE_RULES_PATH

def _parse_seven_numbers(raw: str) -> tuple[int, ...]:
    cleaned = raw.replace("조", " ").replace(",", " ").strip()
    tokens = cleaned.split()
    if len(tokens) == 2 and len(tokens[1]) == 6:
        group_str = tokens[0]
        digits_str = tokens[1]
        parts = [group_str] + list(digits_str)
    elif len(tokens) == 1 and len(tokens[0]) == 7:
        parts = list(tokens[0])
    else:
        parts = tokens

    if len(parts) != 7:
        raise ValueError("You must enter 7 numbers (Group + 6 digits), e.g. '1 234567' or '1조 234567'")

    try:
        values = [int(token) for token in parts]
    except ValueError as exc:
        raise ValueError("All values must be integers") from exc

    if values[0] < 1 or values[0] > 5:
        raise ValueError("Group must be between 1 and 5")
    if any(value < 0 or value > 9 for value in values[1:]):
        raise ValueError("Digits must be between 0 and 9")

    return tuple(values)

def _format_combination(combo: tuple[int, ...]) -> str:
    return f"{combo[0]}조 " + "".join(str(n) for n in combo[1:])

def load_excluded_combinations(
    path: Path = DB_EXCLUDED_COMBINATIONS_PATH,
) -> set[tuple[int, ...]]:
    if not path.exists():
        return set()

    combos: set[tuple[int, ...]] = set()
    with path.open(encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            try:
                group = int(row.get("Group", "0"))
                values = [int(row.get(f"No{index}", "0")) for index in range(1, 7)]
            except ValueError:
                continue

            if group < 1 or group > 5:
                continue
            if any(value < 0 or value > 9 for value in values):
                continue

            combos.add((group, *values))

    return combos

def save_excluded_combinations(
    combos: set[tuple[int, ...]],
    path: Path = DB_EXCLUDED_COMBINATIONS_PATH,
) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(combos)

    with path.open("w", encoding="utf-8", newline="") as csv_file:
        fieldnames = ["Group"] + [f"No{index}" for index in range(1, 7)]
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for combo in ordered:
            row = {"Group": combo[0]}
            for index, val in enumerate(combo[1:], start=1):
                row[f"No{index}"] = val
            writer.writerow(row)

    return len(ordered)

def _print_excluded_combinations(combos: set[tuple[int, ...]]) -> None:
    if not combos:
        print("No excluded combinations.")
        return

    print("Excluded combinations:")
    for index, combo in enumerate(sorted(combos), start=1):
        print(f"{index:>3}. {_format_combination(combo)}")

def manage_excluded_number_combinations() -> None:
    combos = load_excluded_combinations()

    while True:
        print()
        print("Manage Excluded Number Combinations (pt720)")
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
            raw = input("Enter combination (e.g. 1 234567 or 1조 234567): ").strip()
            try:
                combo = _parse_seven_numbers(raw)
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
            raw = input("Enter combination to remove: ").strip()
            try:
                combo = _parse_seven_numbers(raw)
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

# ---------------------------------------------------------------------------
# Exclude rules
# ---------------------------------------------------------------------------

def exclude_all_odds(combo: tuple[int, ...]) -> bool:
    # Exclude if all 6 digits of the number are odd
    return all(digit % 2 != 0 for digit in combo[1:])

def exclude_all_evens(combo: tuple[int, ...]) -> bool:
    # Exclude if all 6 digits of the number are even
    return all(digit % 2 == 0 for digit in combo[1:])

def exclude_sequential(combo: tuple[int, ...]) -> bool:
    # Exclude if there is a sequence of 4 or more identical consecutive digits
    digits_str = "".join(str(n) for n in combo[1:])
    for char in "0123456789":
        if char * 4 in digits_str:
            return True
    return False

def exclude_matching_numbers(combo: tuple[int, ...]) -> bool:
    # Check if this exact 6 digits matches a past draw's 1st prize digits
    # (Group might differ, but matching 6 digits is highly unlikely to repeat)
    from common import read_csv_rows
    past_rows = read_csv_rows()
    digits_str = "".join(str(n) for n in combo[1:])
    for row in past_rows:
        past_digits = "".join(row.get(f"No{i}", "") for i in range(1, 7))
        if past_digits == digits_str:
            return True
    return False

def _load_active_exclude_rule_functions() -> list[callable]:
    path = DB_EXCLUDE_RULES_PATH
    if not path.exists():
        return []

    func_map = {
        "exclude_all_odds": exclude_all_odds,
        "exclude_all_evens": exclude_all_evens,
        "exclude_sequential": exclude_sequential,
        "exclude_matching_numbers": exclude_matching_numbers,
    }

    active_funcs: list[callable] = []
    try:
        with path.open(encoding="utf-8", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                is_active = row.get("is_active", "N").strip()
                if is_active != "Y":
                    continue

                function_name = row.get("function_name", "").strip()
                func = func_map.get(function_name)
                if not func:
                    func = globals().get(function_name)
                if func and callable(func):
                    active_funcs.append(func)
    except Exception:
        pass

    return active_funcs

def generate_my_number_combinations(count: int) -> list[tuple[int, ...]]:
    if count <= 0:
        raise ValueError("count must be a positive integer")

    print(f"generate_my_number_combinations > Generating {count} unique combinations...")
    excluded = load_excluded_combinations()
    active_rules = _load_active_exclude_rule_functions()

    generated: set[tuple[int, ...]] = set()
    total_possible = 5 * 1000000 - len(excluded)
    if count > total_possible:
        raise ValueError("Requested count exceeds available combinations")

    attempts = 0
    max_attempts = max(10000, count * 100)

    while len(generated) < count and attempts < max_attempts:
        group = random.randint(1, 5)
        digits = tuple(random.randint(0, 9) for _ in range(6))
        combo = (group, *digits)
        attempts += 1

        if combo in excluded:
            continue

        should_exclude = False
        for rule in active_rules:
            if rule(combo):
                should_exclude = True
                break

        if should_exclude:
            continue

        generated.add(combo)

    if len(generated) < count:
        print(f"Warning: Only generated {len(generated)} of {count} requested combinations after {attempts} attempts.")

    return sorted(list(generated))

def run_generate_my_number_combinations() -> None:
    count_str = input("Enter number of combinations to generate (default: 5): ").strip()
    if not count_str:
        count = 5
    else:
        try:
            count = int(count_str)
        except ValueError:
            print("Invalid number format.")
            return

    try:
        combos = generate_my_number_combinations(count)
    except Exception as exc:
        print(str(exc))
        return

    print("Generated combinations:")
    for index, combo in enumerate(combos, start=1):
        print(f"{index:>3}. {_format_combination(combo)}")
