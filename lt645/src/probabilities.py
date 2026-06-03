from __future__ import annotations

import math


def calculate_prize_probabilities() -> list[dict[str, str]]:
    """1등부터 5등까지의 당첨 확률과 경우의 수를 계산한다.

    전체 경우의 수는 45개 번호 중 6개를 고르는 조합으로 계산하고,
    각 등수는 해당 조건을 만족하는 조합의 개수와 전체 경우의 수를 비교해
    확률과 '1 in N' 형식의 당첨 가능성으로 변환한다.

    combinations=6: 2등에 해당하는 경우의 수가 6개라는 뜻입니다. 즉, 보너스 번호를 포함해 딱 5개 숫자가 맞는 조합이 6가지 있다는 의미.
    """

    total_tickets = math.comb(45, 6)
    prize_counts = {
        "1st Place": math.comb(6, 6) * math.comb(39, 0),
        "2nd Place": math.comb(6, 5) * math.comb(1, 1),
        "3rd Place": math.comb(6, 5) * math.comb(38, 1),
        "4th Place": math.comb(6, 4) * math.comb(39, 2),
        "5th Place": math.comb(6, 3) * math.comb(39, 3),
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
    print("Lottery prize probabilities")
    print("-" * 72)
    for item in calculate_prize_probabilities():
        print(f"{item['place']:<12} {item['probability']:>14}  {item['odds']:>18}  combinations={item['count']}")
