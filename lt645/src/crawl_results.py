from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from common import DB_RESULT_PATH, read_csv_rows, write_csv_rows


def fetch_lotto_draw(round_no: int) -> dict[str, str] | None:
    # lt645/result 화면이 내부적으로 사용하는 JSON 엔드포인트를 직접 호출한다.
    # 회차 기반 단건 조회는 srchDir=center, srchLtEpsd=<회차> 조합을 사용한다.
    query = urllib.parse.urlencode({"srchDir": "center", "srchLtEpsd": str(round_no)})
    url = f"https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?{query}"

    # AJAX 요청 헤더를 포함하면 결과 페이지와 동일한 호출 형태가 된다.
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    rows = payload.get("data", {}).get("list", [])
    if not rows:
        return None

    # API는 요청 회차 기준 인접 여러 회차를 한꺼번에 반환한다.
    # 목록 중에서 요청 회차와 일치하는 항목만 사용한다.
    matched = [r for r in rows if str(r.get("ltEpsd", "")) == str(round_no)]
    if not matched:
        return None
    item = matched[0]

    # 내부 API 필드명을 기존 CSV 컬럼 스키마로 맞춰 반환한다.
    return {
        "Round": str(item["ltEpsd"]),
        "No1": str(item["tm1WnNo"]),
        "No2": str(item["tm2WnNo"]),
        "No3": str(item["tm3WnNo"]),
        "No4": str(item["tm4WnNo"]),
        "No5": str(item["tm5WnNo"]),
        "No6": str(item["tm6WnNo"]),
        "Bonus": str(item["bnsWnNo"]),
        "FirstPrize": str(item["rnk1WnAmt"]),
        "FirstWinners": str(item["rnk1WnNope"]),
        "SecondPrize": str(item["rnk2WnAmt"]),
        "SecondWinners": str(item["rnk2WnNope"]),
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
    # 현재 CSV를 읽어 마지막으로 저장된 회차를 기준점으로 잡는다.
    existing_rows = read_csv_rows(csv_path)
    latest_round = 0

    if existing_rows:
        try:
            # 저장된 행 중 가장 큰 Round 값을 다음 크롤링 시작점으로 사용한다.
            latest_round = max(int(row.get("Round", 0)) for row in existing_rows)
        except ValueError:
            # Round 값이 비정상인 경우를 대비해 0부터 다시 시작한다.
            latest_round = 0

    # 새로 수집한 회차를 임시로 모아 둔 뒤, 마지막에 한 번에 병합/저장한다.
    new_rows: list[dict[str, str]] = []
    next_round = latest_round + 1
    last_checked_round: int | None = None

    while True:
        # 조회를 시도한 마지막 회차를 기록해, 0건일 때도 사용자에게 알려줄 수 있게 한다.
        last_checked_round = next_round
        draw = fetch_lotto_draw(next_round)
        if draw is None:
            # 해당 회차 데이터가 없으면(미발행/미공개) 반복을 종료한다.
            break
        new_rows.append(draw)
        next_round += 1

    # 실제로 마지막에 어떤 회차를 조회했는지 항상 출력한다.
    if last_checked_round is not None:
        print(f"Last crawled target round: {last_checked_round}")

    if not new_rows:
        # 신규 데이터가 없을 때는 바로 이전 회차를 한 번 더 조회해 참고 출력한다.
        previous_draw: dict[str, str] | None = None
        if last_checked_round is not None and last_checked_round > 1:
            previous_draw = fetch_lotto_draw(last_checked_round - 1)

        print("No new rows found, but the crawl target was checked.")
        if previous_draw is not None:
            print("Previous round data:")
            print_rows_table([previous_draw])
        else:
            print("Previous round data is not available.")
        return 0

    # 저장 직전에 이번 실행으로 수집된 회차만 표로 미리 보여준다.
    print("Crawled rows before saving:")
    print_rows_table(new_rows)

    # 기존 데이터와 신규 데이터를 합친 뒤 Round 기준 오름차순으로 정렬해 저장한다.
    merged_rows = existing_rows + new_rows
    merged_rows.sort(key=lambda row: int(row.get("Round", 0)))
    write_csv_rows(merged_rows, csv_path)

    # 호출 측에서 결과를 출력할 수 있도록 신규 수집 건수를 반환한다.
    return len(new_rows)


def crawl_results_in_range(start_round: int, end_round: int, csv_path=DB_RESULT_PATH) -> int:
    if start_round > end_round:
        raise ValueError("start_round must be less than or equal to end_round")

    existing_rows = read_csv_rows(csv_path)
    crawled_rows: list[dict[str, str]] = []
    missing_rounds: list[int] = []

    for round_no in range(start_round, end_round + 1):
        draw = fetch_lotto_draw(round_no)
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

    # 기존 데이터와 합칠 때 동일 회차는 새로 크롤링한 값으로 갱신한다.
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
