# 신규 결과 크롤링 프로세스 분석

이 문서는 사용자가 `Menu3CrawlNew.tsx`에서 **"Crawl New Results"** 버튼을 클릭했을 때의 실행 흐름을 분석합니다. 이 프로세스는 프론트엔드와 백엔드의 순서로 나누어져 있습니다.

## 1. 프론트엔드 프로세스

**파일:** `fsWeb/src/screens/Menu3CrawlNew.tsx`
**파일:** `fsWeb/src/api/client.ts`

1. **사용자 상호작용**: 사용자가 UI에서 "Crawl New Results" `<button>`을 클릭합니다.
2. **이벤트 핸들러**: `onClick` 핸들러는 비동기 실행을 관리하는 `runTask` 래퍼(wrapper) 함수를 호출합니다.
3. **API 호출**: `runTask` 내부에서 API 클라이언트의 `crawlNewResults()` 함수를 호출합니다.
    ```typescript
    // client.ts 내부
    export async function crawlNewResults(): Promise<{ crawled: number }> {
      return request<{ crawled: number }>("/api/lt645/crawl", { method: "POST" });
    }
    ```
4. **네트워크 요청**: API 클라이언트가 백엔드 엔드포인트 `/api/lt645/crawl` 로 HTTP `POST` 요청을 보냅니다.
5. **상태 업데이트**: 요청이 완료되면 프론트엔드는 `{"crawled": count}` 형태의 JSON 객체를 받습니다. 이후 다음과 같이 상태를 업데이트합니다:
    * `setLastResponse(data)`: 응답 표시 영역을 업데이트합니다.
    * `setMessage(...)`: "Crawled 3 new rows."와 같은 성공 메시지를 보여줍니다.

---

## 2. 백엔드 프로세스

**파일:** `lt645/src/server.py`
**파일:** `lt645/src/crawl_results.py`

1. **엔드포인트 처리**: 백엔드에서 실행 중인 FastAPI 애플리케이션이 `POST /api/lt645/crawl` 요청을 인터셉트(intercept) 합니다.
    ```python
    # server.py 내부
    @app.post("/api/lt645/crawl")
    def crawl():
        count = crawl_new_results()
        return {"crawled": count}
    ```
2. **초기화 (`crawl_new_results`)**: 
    * 백엔드는 `read_csv_rows()`를 통해 기존 데이터셋(`db/result.csv`)을 읽어옵니다.
    * 파싱된 행(rows)에서 `Round` 번호의 최댓값을 찾아 `latest_round` (가장 최근 회차)를 계산합니다.
    * 다음으로 조회할 회차를 결정합니다: `next_round = latest_round + 1`.
3. **데이터 수집 루프**:
    * 로또 API로부터 순차적으로 데이터를 가져오기 위해 `while True:` 루프에 진입합니다.
    * 외부 URL을 쿼리합니다: `https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd={next_round}`.
    * 이 요청은 브라우저의 요청처럼 보이기 위해 특정 AJAX 헤더(`X-Requested-With: XMLHttpRequest`)와 함께 전송됩니다.
4. **응답 파싱 (`fetch_lotto_draw`)**:
    * 응답 데이터에 일치하는 `ltEpsd`(회차 번호)가 포함되어 있다면, JSON 키를 내부 애플리케이션 스키마(`Round`, `No1`-`No6`, `Bonus`, `FirstPrize` 등)에 매핑합니다.
    * 대상 회차가 아직 존재하지 않는 경우(미발표), `fetch_lotto_draw`는 `None`을 반환하고 `while` 루프가 종료(break)됩니다.
5. **데이터 저장**:
    * 새 행이 발견된 경우(`new_rows`가 비어있지 않음), 기존 행(`existing_rows`)과 병합합니다.
    * 병합된 데이터셋은 `Round` 번호를 기준으로 오름차순 정렬됩니다.
    * 정렬된 행들은 `write_csv_rows(merged_rows, csv_path)`를 통해 CSV 파일에 다시 저장됩니다.
6. **반환**: 백엔드는 새로 크롤링된 행의 개수를 `{"crawled": count}` 형태로 프론트엔드 엔드포인트에 반환합니다.
