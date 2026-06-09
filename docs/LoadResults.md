# `Load Results` 동작 분석 (Menu 5)

이 문서는 `fsWeb/src/screens/Menu5ShowResults.tsx` 화면에서 "Load Results" 버튼을 클릭했을 때, 프론트엔드 React 컴포넌트부터 백엔드 FastAPI 서버까지 이어지는 엔드투엔드(end-to-end) 흐름을 설명합니다.

## 1. 프론트엔드 흐름: 액션 트리거

1. **사용자 상호작용**:
   사용자가 `Menu5ShowResults` 컴포넌트 내의 **"Load Results"** 버튼을 클릭합니다.
   
2. **검증 및 준비 (`Menu5ShowResults.tsx`)**:
   `onClick` 핸들러가 실행되며 `runTask()` 래퍼(wrapper)를 통해 UI를 로딩 상태로 변경합니다.
   - 입력된 `showStartRound`(시작 회차)와 `showEndRound`(종료 회차) 값을 확인합니다.
   - **Case A (범위 미지정)**: 두 필드가 모두 비어있을 경우, `getResults({ limit: 10 })`을 호출하여 최신 결과 10개를 요청하도록 기본 동작합니다.
   - **Case B (범위 지정)**: 두 필드가 모두 입력되었을 경우, 유효한 양의 정수인지 확인하고 `시작 회차 <= 종료 회차`인지 검증합니다. 유효하다면 `getResults({ startRound: start, endRound: end })`를 호출합니다.
   - 둘 중 하나의 필드만 입력되었을 경우 예외(Error)를 발생시키며, 이는 `runTask()`에서 잡아서 에러 메시지로 화면에 표시합니다.

3. **API 클라이언트 (`fsWeb/src/api/client.ts`)**:
   `getResults` 함수는 전달받은 파라미터(`startRound`, `endRound`, `limit`)를 사용해 `URLSearchParams`로 쿼리 스트링을 만듭니다.
   - 브라우저의 내장 `fetch` API를 사용하여 `/api/lt645/results?limit=10` (또는 `?startRound=X&endRound=Y`) 주소로 HTTP `GET` 요청을 수행합니다.

---

## 2. 백엔드 흐름: 요청 처리

4. **라우팅 및 파라미터 검증 (`lt645/src/server.py`)**:
   FastAPI 백엔드는 `@app.get("/api/lt645/results")` 엔드포인트에서 요청을 받아 `get_results` 함수로 처리합니다.
   - FastAPI는 쿼리 스트링을 분석하여 `startRound`, `endRound`, `limit` 파라미터로 자동 매핑합니다.
   - 추가적인 검증을 통해 `startRound`와 `endRound`가 0보다 큰 양수인지, 그리고 `startRound <= endRound`인지 확인합니다. 이 규칙에 어긋날 경우 HTTP `422 Unprocessable Entity` 에러를 반환합니다.

5. **데이터베이스 파일 읽기 (`lt645/src/common.py`)**:
   - 라우터 함수 내에서 `read_csv_rows()`를 호출합니다.
   - 이 함수는 `DB_RESULT_PATH`(보통 `db/result.csv`)에 위치한 CSV 파일을 열고 `csv.DictReader`로 파싱하여, CSV의 헤더를 딕셔너리 키로 사용하는 데이터 행(row) 리스트를 반환합니다.

6. **정렬 및 필터링 (`lt645/src/server.py`)**:
   - **정렬**: 조회된 데이터 행들을 `Round`(회차) 값을 기준으로 내림차순 정렬하여 최신 회차가 가장 먼저 오도록 합니다.
   - **범위 필터링**: `startRound`나 `endRound`가 전달된 경우, 정렬된 리스트를 순회하며 회차(`Round`)가 `[startRound, endRound]` 포함 범위 바깥에 있는 데이터를 걸러냅니다(제외합니다).
   - **Limit (제한)**: 범위를 지정하지 않고 `limit=10` 파라미터가 전달된 경우, 리스트를 슬라이싱하여 상위 10개의 아이템만 유지합니다 (`raw_rows[:limit]`).

7. **데이터 직렬화 (Serialization)**:
   - 필터링된 행 데이터들은 `_csv_row_to_result()` 함수를 거칩니다. 이 함수는 CSV 컬럼 이름(`Round`, `No1`, `No2`, ..., `Bonus`)을 구조화된 Pydantic 모델(`ResultRow`) 스키마로 매핑하며, 문자열 숫자 값을 정수(int) 타입으로 캐스팅합니다.
   - 파싱에 실패한 (잘못된 형태의) 행은 버려집니다.
   - 최종적으로 가공된 리스트는 `{"rows": [...]}` 형태의 JSON 객체로 반환됩니다.

---

## 3. 프론트엔드 흐름: 데이터 렌더링

8. **상태 업데이트**:
   `client.ts`의 `fetch` 호출이 백엔드의 JSON 응답과 함께 완료됩니다.
   다시 `Menu5ShowResults.tsx`로 돌아와, 응답받은 페이로드(payload)가 컴포넌트의 상태(state)를 업데이트합니다:
   - `setResults(data.rows)`를 통해 로또 결과 배열을 저장합니다.
   - `setLastResponse(data)`를 통해 화면 하단의 "Last response" 패널을 업데이트합니다.
   - `setMessage(...)`를 통해 성공 메시지 ("Loaded 10 latest rows." 또는 "Loaded X rows from round Y to Z.")를 표시합니다.
   - `runTask`의 실행이 종료되며 UI의 로딩 상태가 해제됩니다.

9. **UI 업데이트**:
   상태가 변경됨에 따라 React가 컴포넌트를 다시 렌더링(re-render)합니다. `renderResultsTable()` 함수는 `results.length > 0`인 것을 확인하고 `<table class="data-table">` 형태의 HTML을 그려내어, 각 데이터 아이템에 대한 회차(`Round`), 날짜(`Date`), 포맷팅된 번호(`Numbers`), 보너스 번호(`Bonus`)를 테이블에 표시해 줍니다.
