from __future__ import annotations

def calculate_prize_probabilities() -> list[dict[str, str]]:
    """Calculates the probabilities and favorable outcomes for each prize tier in PT720.
    
    Total number of tickets: 5 groups * 1,000,000 (000000 to 999999) = 5,000,000
    """
    total_tickets = 5000000
    
    # Favorable cases for each rank
    prize_counts = {
        "1st Place": 1,
        "2nd Place": 4,      # Same 6 digits, different group
        "3rd Place": 45,     # Last 5 digits match, first digit of number does not match, any group
        "4th Place": 450,    # Last 4 digits match
        "5th Place": 4500,   # Last 3 digits match
        "6th Place": 45000,  # Last 2 digits match
        "7th Place": 450000, # Last 1 digit matches
        "Bonus": 5           # Same 6 digits as bonus, any group
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
    print("Pension Lottery 720+ prize probabilities")
    print("-" * 72)
    for item in calculate_prize_probabilities():
        print(f"{item['place']:<12} {item['probability']:>14}  {item['odds']:>18}  combinations={item['count']}")
