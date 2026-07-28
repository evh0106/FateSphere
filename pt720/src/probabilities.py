from __future__ import annotations

def calculate_prize_probabilities() -> list[dict[str, str]]:
    """Calculates the probabilities and favorable outcomes for each prize tier in PT720.
    
    Total number of tickets: 5 groups * 1,000,000 (000000 to 999999) = 5,000,000
    """
    total_tickets = 5000000
    
    prize_counts = [
        ("1st Prize (7 digits)", 1),
        ("2nd Prize (6 digits)", 4),
        ("3rd Prize (5 digits)", 45),
        ("4th Prize (4 digits)", 450),
        ("5th Prize (3 digits)", 4500),
        ("6th Prize (2 digits)", 45000),
        ("7th Prize (1 digit)", 450000),
        ("Bonus (6 digits)", 5),
    ]

    results: list[dict[str, str]] = []
    for place, count in prize_counts:
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
