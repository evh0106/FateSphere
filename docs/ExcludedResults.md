# 제외 규칙 결과 조회 프로세스 분석

이 문서는 사용자가 `Menu6ManageExcluded.tsx` 화면의 **Results** 열에서 **"조회"** 버튼을 클릭했을 때의 실행 흐름을 분석합니다. 이 프로세스는 프론트엔드와 백엔드의 순서로 나누어져 있습니다.

## 1. 프론트엔드 프로세스

**파일:** `fsWeb/src/screens/lt645/Menu6ManageExcluded.tsx`  
**파일:** `fsWeb/src/api/client.ts`  
**파일:** `fsWeb/src/App.tsx`

1. **사용자 상호작용**: 사용자가 제외 규칙 테이블의 **Results** 열에 있는 **"조회"** `<button>`을 클릭합니다. 해당 행의 `function_name`(호출 함수 명)이 클릭 핸들러에 전달됩니다.

2. **모달 즉시 표시 (`handleRunRule`)**: API 응답을 기다리기 전에 조회 결과 모달이 먼저 열립니다.
   * `setTestingFunctionName(funcName)`: 조회 중인 함수명을 저장합니다.
   * `setTestError("")`, `setTestExcludedCount(null)`, `setTestExcludedRows([])`: 이전 조회 결과를 초기화합니다.
   * `setIsTestModalOpen(true)`: 모달을 열어 "결과를 불러오는 중입니다..." 로딩 문구를 표시합니다.

3. **이벤트 핸들러 및 `runTask` 래퍼**: `onClick` 핸들러는 `App.tsx`에서 주입된 `runTask` 래퍼를 호출합니다.
   ```typescript
   // App.tsx 내부
   async function runTask(task: () => Promise<void>) {
     try {
       setLoading(true);
       setMessage("Running...");
       await task();
     } catch (error) {
       setMessage(`Error: ${msg}`);
     } finally {
       setLoading(false);
     }
   }
   ```
   화면 전체 로딩 상태(`loading`)와 하단 메시지(`message`)가 갱신됩니다. `handleRunRule` 내부에 별도 `try/catch`가 있어 API 오류는 모달의 `testError` 상태로도 처리됩니다.

4. **API 호출**: `runTask` 내부에서 API 클라이언트의 `runExcludeRuleLt645(funcName)` 함수를 호출합니다.
   ```typescript
   // client.ts 내부
   export async function runExcludeRuleLt645(functionName: string): Promise<{
     function_name: string;
     excluded_count: number;
     rows: Array<{ round: number; numbers: number[]; bonus: number; draw_date: string }>;
   }> {
     return request("/api/lt645/exclude-rules/run", {
       method: "POST",
       body: JSON.stringify({ function_name: functionName })
     });
   }
   ```

5. **네트워크 요청**: API 클라이언트가 백엔드 엔드포인트 `/api/lt645/exclude-rules/run`으로 HTTP `POST` 요청을 보냅니다. 요청 본문(body)에는 `{ "function_name": "<함수명>" }` JSON이 포함됩니다.

6. **상태 업데이트 (성공 시)**: 요청이 완료되면 프론트엔드는 아래 형태의 JSON 객체를 받습니다.
   ```json
   {
     "function_name": "exclude_all_odds",
     "excluded_count": 3,
     "rows": [
       { "round": 100, "numbers": [1, 3, 5, 7, 9, 11], "bonus": 13, "draw_date": "2024-01-01" }
     ]
   }
   ```
   이후 다음과 같이 상태를 업데이트합니다.
   * `setTestExcludedCount(response.excluded_count)`: 규칙에 해당하는 과거 당첨 조합 수를 저장합니다.
   * `setTestExcludedRows(response.rows)`: 제외 대상 당첨 번호 목록을 저장합니다.
   * `setMessage(...)`: `"Executed lookup for exclude function: <함수명>"` 성공 메시지를 표시합니다.

7. **상태 업데이트 (실패 시)**: `request()`가 HTTP 오류 응답을 받으면 예외를 던집니다. `handleRunRule`의 `catch` 블록에서:
   * `setTestError(msg)`: 모달에 에러 메시지를 표시합니다.
   * `setMessage(...)`: `"Failed to execute lookup: ..."` 메시지를 표시합니다.

8. **UI 렌더링 (모달)**: `testExcludedCount`가 `null`이 아니면 모달 본문이 갱신됩니다.
   * **제외 건수**: `"Number of past winning combinations excluded by this rule: <count>"` 형태로 표시합니다.
   * **결과 테이블**: `Round`, `Winning Numbers`, `Bonus` 열로 각 당첨 회차를 나열합니다. 번호는 2자리(`01`, `02` …)로 포맷합니다.
   * **빈 결과**: `rows`가 비어 있으면 `"There are no past winning numbers excluded by this rule."` 문구를 표시합니다.

---

## 2. 백엔드 프로세스

**파일:** `lt645/src/server.py`  
**파일:** `lt645/src/my_combinations.py`  
**파일:** `lt645/src/common.py`

1. **엔드포인트 처리**: FastAPI 애플리케이션이 `POST /api/lt645/exclude-rules/run` 요청을 수신합니다.
   ```python
   # server.py 내부
   @app.post("/api/lt645/exclude-rules/run")
   def run_exclude_rule(body: dict):
       function_name = body.get("function_name")
       if not function_name:
           raise HTTPException(status_code=422, detail="function_name is required")

       from my_combinations import run_exclude_rule_on_results
       try:
           excluded = run_exclude_rule_on_results(function_name)
           return {"function_name": function_name, "excluded_count": len(excluded), "rows": excluded}
       except ValueError as exc:
           raise HTTPException(status_code=404, detail=str(exc))
       except Exception as exc:
           raise HTTPException(status_code=500, detail=str(exc))
   ```
   * `function_name`이 없으면 HTTP `422`를 반환합니다.
   * 함수를 찾을 수 없으면 HTTP `404`를 반환합니다.
   * 그 외 예외는 HTTP `500`으로 처리합니다.

2. **제외 함수 해석 (`run_exclude_rule_on_results`)**: `function_name` 문자열을 실제 Python 함수 객체로 매핑합니다.
   ```python
   func_map = {
       "exclude_all_odds": exclude_all_odds,
       "exclude_all_evens": exclude_all_evens,
       "exclude_sequential": exclude_sequential,
   }
   func = func_map.get(function_name) or globals().get(function_name)
   ```
   * 내장 매핑(`func_map`)에 없으면 `my_combinations` 모듈의 전역 네임스페이스(`globals()`)에서 동적 조회를 시도합니다.
   * 어느 쪽에서도 찾지 못하면 `ValueError`를 발생시킵니다.

3. **당첨 이력 로드**: `read_csv_rows()`를 호출하여 `db/result.csv`의 전체 행을 읽어옵니다.
   ```python
   # common.py 내부
   def read_csv_rows(path: Path = DB_RESULT_PATH) -> list[dict[str, str]]:
       ...
   ```
   > **참고:** UI 테이블의 `Start Round` / `End Round` 값은 이 조회 API에 전달되지 않습니다. 조회는 `result.csv`의 **전체 회차**를 대상으로 수행됩니다.

4. **규칙 적용 루프**: CSV의 각 행에 대해 당첨 번호 6개(`No1`~`No6`)를 튜플로 구성하고, 제외 함수를 호출합니다.
   ```python
   combo = (int(r["No1"]), int(r["No2"]), ..., int(r["No6"]))
   if func(combo):
       excluded_draws.append({...})
   ```
   * **보너스 번호(`Bonus`)는 조합 판정에 사용되지 않습니다.** 메인 당첨 번호 6개만 검사합니다.
   * `KeyError`, `ValueError`가 발생한 행은 건너뜁니다.

5. **제외 함수의 의미**: 각 제외 함수는 `(No1, …, No6)` 튜플을 받아, **해당 규칙에 의해 제외되어야 하는 조합이면 `True`** 를 반환합니다.
   | 함수명 | 반환 `True` 조건 |
   |---|---|
   | `exclude_all_odds` | 6개 번호가 모두 홀수 |
   | `exclude_all_evens` | 6개 번호가 모두 짝수 |
   | `exclude_sequential` | 3개 이상 연속된 번호가 존재 |

6. **결과 정렬 및 직렬화**: 조건을 만족한 행을 수집한 뒤, `round` 기준 **내림차순**으로 정렬합니다. 각 항목은 아래 필드를 갖습니다.
   * `round`: 회차 (`Round` 컬럼)
   * `numbers`: 당첨 번호 6개 리스트
   * `bonus`: 보너스 번호
   * `draw_date`: 추첨일 (`DrawDate` 또는 `draw_date` 컬럼, 없으면 빈 문자열)

7. **반환**: 백엔드는 아래 형태의 JSON을 프론트엔드에 반환합니다.
   ```json
   {
     "function_name": "<요청한 함수명>",
     "excluded_count": <제외 대상 회차 수>,
     "rows": [ ... ]
   }
   ```

---

## 3. 데이터 흐름 요약

```
[조회 버튼 클릭]
    → handleRunRule(function_name)
    → 모달 열림 (로딩 표시)
    → runTask → runExcludeRuleLt645()
    → POST /api/lt645/exclude-rules/run
    → run_exclude_rule_on_results()
        → db/result.csv 전체 읽기
        → 각 회차 No1~No6에 제외 함수 적용
        → True인 회차만 수집·정렬
    → JSON 응답
    → 모달에 제외 건수 및 당첨 번호 테이블 표시
```

## 4. 관련 파일

| 구분 | 파일 | 역할 |
|---|---|---|
| UI | `fsWeb/src/screens/lt645/Menu6ManageExcluded.tsx` | 조회 버튼, 모달, 상태 관리 |
| API 클라이언트 | `fsWeb/src/api/client.ts` | `runExcludeRuleLt645()` HTTP 호출 |
| 공통 래퍼 | `fsWeb/src/App.tsx` | `runTask` 로딩/에러 처리 |
| API 라우터 | `lt645/src/server.py` | `/api/lt645/exclude-rules/run` 엔드포인트 |
| 비즈니스 로직 | `lt645/src/my_combinations.py` | 제외 함수 정의 및 `run_exclude_rule_on_results()` |
| 데이터 | `lt645/db/result.csv` | 과거 당첨 번호 원본 |
| 규칙 메타 | `lt645/db/exclude_rules.csv` | 규칙명·함수명·활성 상태 (조회 시 직접 참조하지 않음) |
