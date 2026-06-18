# 내 번호 조합 생성 프로세스 분석

이 문서는 사용자가 `Menu9GenerateCombinations.tsx`에서 **"Generate"** 버튼을 클릭했을 때의 실행 흐름을 분석합니다. 이 프로세스는 프론트엔드와 백엔드의 순서로 나누어져 있습니다.

## 1. 프론트엔드 프로세스

**파일:** `fsWeb/src/screens/lt645/Menu9GenerateCombinations.tsx`  
**파일:** `fsWeb/src/api/client.ts`  
**파일:** `fsWeb/src/App.tsx`  
**파일:** `fsWeb/src/utils.ts`

1. **사용자 상호작용**: 사용자가 **Count** 입력 필드에 생성할 조합 개수를 입력한 뒤, **"Generate"** `<button>`을 클릭합니다. 기본값은 `"5"`입니다.

2. **이벤트 핸들러**: `onClick` 핸들러는 비동기 실행을 관리하는 `runTask` 래퍼(wrapper) 함수를 호출합니다.
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
   화면 전체 로딩 상태(`loading`)와 하단 메시지(`message`)가 갱신됩니다.

3. **입력값 검증**: `runTask` 내부에서 Count 문자열을 숫자로 변환하고 유효성을 검사합니다.
   ```typescript
   const count = Number(generateCount);
   if (!Number.isInteger(count) || count <= 0) {
     throw new Error("Count must be a positive integer.");
   }
   ```
   검증에 실패하면 예외가 발생하고, `runTask`의 `catch` 블록에서 `"Error: Count must be a positive integer."` 메시지가 표시됩니다. 이 단계에서는 API 호출이 이루어지지 않습니다.

4. **API 호출**: 검증을 통과하면 API 클라이언트의 `generateMyCombinations(count)` 함수를 호출합니다.
   ```typescript
   // client.ts 내부
   export async function generateMyCombinations(count: number): Promise<{ combinations: number[][] }> {
     return request<{ combinations: number[][] }>("/api/lt645/generate", {
       method: "POST",
       body: JSON.stringify({ count })
     });
   }
   ```

5. **네트워크 요청**: API 클라이언트가 백엔드 엔드포인트 `/api/lt645/generate`로 HTTP `POST` 요청을 보냅니다. 요청 본문(body)에는 `{ "count": <개수> }` JSON이 포함됩니다.

6. **상태 업데이트**: 요청이 완료되면 프론트엔드는 아래 형태의 JSON 객체를 받습니다.
   ```json
   {
     "combinations": [
       [1, 7, 14, 22, 33, 41],
       [3, 9, 18, 25, 30, 44]
     ]
   }
   ```
   이후 다음과 같이 상태를 업데이트합니다.
   * `setGeneratedRows(data.combinations)`: 생성된 번호 조합 목록을 저장합니다.
   * `setLastResponse(data)`: 응답 표시 영역을 업데이트합니다.
   * `setMessage(...)`: `"Generated 5 combinations."`와 같은 성공 메시지를 보여줍니다.

7. **UI 렌더링**: `renderGeneratedList()`가 `generatedRows` 상태를 기반으로 결과를 표시합니다.
   * 조합이 없으면 `"No combinations generated yet."` 문구를 표시합니다.
   * 조합이 있으면 `<ol class="generated-list">` 순번 목록으로 각 조합을 렌더링합니다.
   * `formatNumbers()` 유틸리티가 각 번호를 2자리(`01`, `02` …)로 포맷하여 공백으로 구분해 출력합니다.
   ```typescript
   // utils.ts 내부
   export function formatNumbers(numbers: number[]): string {
     return numbers.map((num) => String(num).padStart(2, "0")).join(" ");
   }
   ```

---

## 2. 백엔드 프로세스

**파일:** `lt645/src/server.py`  
**파일:** `lt645/src/my_combinations.py`  
**파일:** `lt645/src/common.py`

1. **엔드포인트 처리**: FastAPI 애플리케이션이 `POST /api/lt645/generate` 요청을 수신합니다.
   ```python
   # server.py 내부
   class GenerateRequest(BaseModel):
       count: int = Field(default=5, gt=0)

   @app.post("/api/lt645/generate")
   def generate(body: GenerateRequest):
       try:
           result = generate_my_number_combinations(body.count)
       except (ValueError, RuntimeError) as exc:
           raise HTTPException(status_code=422, detail=str(exc)) from exc
       return {"combinations": [list(combo) for combo in result]}
   ```
   * Pydantic 모델이 `count`가 0보다 큰 정수인지 자동 검증합니다.
   * 생성 중 `ValueError` 또는 `RuntimeError`가 발생하면 HTTP `422`와 함께 오류 메시지를 반환합니다.

2. **제외 목록 로드 (`generate_my_number_combinations`)**: 
   * `load_excluded_combinations()`를 호출하여 `db/excluded_combinations.csv`에 등록된 제외 조합을 읽어옵니다.
   * CSV의 `No1`~`No6` 컬럼을 정렬된 6개 번호 튜플 집합(`set[tuple[int, ...]]`)으로 변환합니다.
   * 파일이 없거나 유효하지 않은 행은 무시됩니다.
   > **참고:** Menu 6의 `exclude_rules.csv`(제외 규칙 함수)는 이 생성 프로세스에서 **직접 사용되지 않습니다.** 생성 시 필터링에 적용되는 것은 `db/excluded_combinations.csv`에 명시적으로 등록된 조합뿐입니다.

3. **생성 가능 개수 확인**:
   * 로또 6/45 전체 조합 수는 `45C6 = 8,145,060`입니다.
   * `max_possible = 8,145,060 - len(excluded)` 로 남은 조합 수를 계산합니다.
   * 요청 개수(`count`)가 `max_possible`을 초과하면 `ValueError("Requested count exceeds available combinations")`를 발생시킵니다.

4. **무작위 조합 생성 루프**:
   * `generated` 집합과 시도 횟수(`attempts`)를 초기화합니다.
   * 최대 시도 횟수는 `max(1000, count * 50)`으로 설정됩니다.
   * `while len(generated) < count and attempts < max_attempts:` 루프에서 다음을 반복합니다.
     1. `random.sample(range(1, 46), 6)`으로 1~45 중 6개 번호를 무작위 추출합니다.
     2. 추출된 번호를 오름차순 정렬하여 튜플(`combo`)로 만듭니다.
     3. `combo`가 제외 목록(`excluded`)에 포함되어 있으면 건너뜁니다.
     4. 그렇지 않으면 `generated` 집합에 추가합니다(중복 조합 자동 방지).
   * 루프 종료 후에도 요청 개수만큼 생성하지 못하면 `RuntimeError("Could not generate enough unique combinations")`를 발생시킵니다.

5. **정렬 및 반환**:
   * 생성된 조합 튜플 리스트를 오름차순 정렬합니다.
   * 각 튜플을 리스트로 변환하여 `{"combinations": [[...], [...], ...]}` 형태의 JSON으로 프론트엔드에 반환합니다.

---

## 3. 데이터 흐름 요약

```
[Generate 버튼 클릭]
    → runTask 시작 (로딩 표시)
    → Count 입력값 검증 (양의 정수)
    → generateMyCombinations(count)
    → POST /api/lt645/generate  { count }
    → generate_my_number_combinations(count)
        → db/excluded_combinations.csv 로드
        → 무작위 6개 번호 생성 (1~45, 중복 없음)
        → 제외 목록·이미 생성된 조합과 충돌 시 재시도
        → 요청 개수만큼 수집 후 정렬
    → JSON 응답 { combinations: [...] }
    → 화면에 번호 조합 목록 표시
```

## 4. 관련 파일

| 구분 | 파일 | 역할 |
|---|---|---|
| UI | `fsWeb/src/screens/lt645/Menu9GenerateCombinations.tsx` | Count 입력, Generate 버튼, 결과 목록 |
| API 클라이언트 | `fsWeb/src/api/client.ts` | `generateMyCombinations()` HTTP 호출 |
| 공통 래퍼 | `fsWeb/src/App.tsx` | `runTask` 로딩/에러 처리 |
| 포맷 유틸 | `fsWeb/src/utils.ts` | `formatNumbers()` 2자리 번호 표시 |
| API 라우터 | `lt645/src/server.py` | `/api/lt645/generate` 엔드포인트 |
| 비즈니스 로직 | `lt645/src/my_combinations.py` | `generate_my_number_combinations()`, `load_excluded_combinations()` |
| 제외 데이터 | `lt645/db/excluded_combinations.csv` | 생성 시 제외할 6개 번호 조합 |

## 5. CLI 대응

동일한 생성 로직은 CLI에서도 사용됩니다.

* **대화형 메뉴**: `lt645/src/main.py` 메뉴 9 → `run_generate_my_number_combinations()` (개수 입력 후 콘솔 출력)
* **서브커맨드**: `python main.py generate --count 5` → `generate_my_number_combinations(args.count)` 직접 호출

웹 UI의 Generate 버튼은 위 CLI 메뉴 9와 동일한 `generate_my_number_combinations()` 함수를 HTTP API로 호출하는 형태입니다.
