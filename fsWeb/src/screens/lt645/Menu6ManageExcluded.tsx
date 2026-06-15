import { useEffect, useState } from "react";
import { addExcludeRule, getExcludeRules, runExcludeRuleLt645, saveExcludeRules } from "../../api/client";
import type { ExcludeRule } from "../../types";
import type { MenuProps } from "./types";

interface ExcludedDrawRow {
  round: number;
  numbers: number[];
  bonus: number;
  draw_date: string;
}

export default function Menu6ManageExcluded({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [excludeRules, setExcludeRules] = useState<ExcludeRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [functionName, setFunctionName] = useState("");

  // 제외 규칙 조회/테스트 관련 상태
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testingFunctionName, setTestingFunctionName] = useState("");
  const [testExcludedCount, setTestExcludedCount] = useState<number | null>(null);
  const [testExcludedRows, setTestExcludedRows] = useState<ExcludedDrawRow[]>([]);
  const [testError, setTestError] = useState("");
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>({});

  async function loadExcludeRules() {
    const data = await getExcludeRules();
    setExcludeRules(data.rows);
    setCheckedRows({});
    setLastResponse(data);
  }

  useEffect(() => {
    runTask(async () => {
      await loadExcludeRules();
      setMessage("Loaded exclude rules.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveRule = () => {
    if (!ruleName.trim() || !functionName.trim()) {
      alert("규칙명과 호출 함수 명을 모두 입력해주세요.");
      return;
    }
    runTask(async () => {
      const result = await addExcludeRule(ruleName, functionName);
      setMessage(`Exclusion rule has been successfully added.: ${result.rule_name}`);
      setIsModalOpen(false);
      setRuleName("");
      setFunctionName("");
      await loadExcludeRules();
    });
  };

  const handleRunRule = (funcName: string) => {
    setTestingFunctionName(funcName);
    setTestError("");
    setTestExcludedCount(null);
    setTestExcludedRows([]);
    setIsTestModalOpen(true);

    runTask(async () => {
      try {
        const response = await runExcludeRuleLt645(funcName);
        setTestExcludedCount(response.excluded_count);
        setTestExcludedRows(response.rows);
        setMessage(`Executed lookup for exclude function: ${funcName}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTestError(msg);
        setMessage(`Failed to execute lookup: ${msg}`);
      }
    });
  };

  const handleCheckRow = (index: number) => {
    setCheckedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleStatusChange = (index: number, newStatus: string) => {
    const updatedRules = [...excludeRules];
    updatedRules[index].is_active = newStatus;
    setExcludeRules(updatedRules);
  };

  const handleSaveAllRules = () => {
    runTask(async () => {
      const result = await saveExcludeRules(excludeRules);
      setMessage(`${result.message}. (Saved ${result.count} rules)`);
      await loadExcludeRules();
    });
  };

  return (
    <section className="panel">
      <h2>Manage Excluded Number Combinations</h2>
      <p className="muted">Equivalent to CLI menu 6.</p>
      
      <div className="row-actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            runTask(async () => {
              await loadExcludeRules();
              setMessage("Exclude rules refreshed.");
            })
          }
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            background: "var(--accent-emphasis)",
            color: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)"
          }}
        >
          Add Rule
        </button>
        <button
          type="button"
          onClick={handleSaveAllRules}
          style={{
            background: "var(--success-emphasis)",
            color: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)"
          }}
        >
          Save
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "40px", textAlign: "center" }}>check</th>
              <th>Rule Name</th>
              <th>Function Name</th>
              <th>Start Round</th>
              <th>End Round</th>
              <th>Updated At</th>
              <th>Status</th>
              <th>Results</th>
            </tr>
          </thead>
          <tbody>
            {excludeRules.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1.5rem" }}>
                  등록된 제외 규칙이 없습니다.
                </td>
              </tr>
            ) : (
              excludeRules.map((item, index) => (
                <tr key={`${item.rule_name}-${index}`}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!checkedRows[index]}
                      onChange={() => handleCheckRow(index)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.rule_name}</td>
                  <td><code>{item.function_name}</code></td>
                  <td>{item.start_round ? `${item.start_round}` : "1"}</td>
                  <td>{item.end_round ? `${item.end_round}` : "All"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--fg-muted)" }}>{item.updated_at || "-"}</td>
                  <td>
                    <select
                      value={item.is_active}
                      onChange={(e) => handleStatusChange(index, e.target.value)}
                      disabled={!checkedRows[index]}
                      style={{
                        padding: "0.2rem 0.4rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border-default)",
                        background: checkedRows[index] ? "var(--bg-default)" : "var(--bg-subtle)",
                        color: checkedRows[index] ? "var(--fg-default)" : "var(--fg-muted)",
                        cursor: checkedRows[index] ? "pointer" : "not-allowed"
                      }}
                    >
                      <option value="Y">사용중</option>
                      <option value="N">미사용</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRunRule(item.function_name)}
                      style={{
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.8rem",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      조회
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>제외 규칙 추가</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span>규칙명</span>
                <input
                  type="text"
                  placeholder="예: 홀수 6개 제외"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span>호출 함수 명</span>
                <input
                  type="text"
                  placeholder="예: exclude_all_odds"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  setRuleName("");
                  setFunctionName("");
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                style={{
                  background: "var(--accent-emphasis)",
                  color: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.1)"
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 규칙 조회 팝업 (모달) */}
      {isTestModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTestModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "500px", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>
              Viewing results of applying exclusion rules
            </h3>
            <p className="muted" style={{ margin: "-0.5rem 0 0.5rem" }}>
              Function name: <code>{testingFunctionName}</code>
            </p>

            {testError ? (
              <div style={{ color: "var(--danger-emphasis)", padding: "1rem", background: "#ffebe9", borderRadius: "6px" }}>
                <strong>에러 발생:</strong> {testError}
              </div>
            ) : testExcludedCount === null ? (
              <p>결과를 불러오는 중입니다...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", overflow: "hidden" }}>
                <div>
                  Number of past winning combinations excluded by this rule:{" "}
                  <strong>{testExcludedCount}</strong>
                </div>

                <div style={{ overflowY: "auto", maxHeight: "250px", border: "1px solid var(--border-muted)", borderRadius: "6px" }}>
                  <table className="data-table" style={{ margin: 0, border: "none" }}>
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Winning Numbers</th>
                        <th>Bonus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testExcludedRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1rem" }}>
                            There are no past winning numbers excluded by this rule.
                          </td>
                        </tr>
                      ) : (
                        testExcludedRows.map((row) => (
                          <tr key={row.round}>
                            <td>{row.round}</td>
                            <td>
                              {row.numbers.map(n => String(n).padStart(2, "0")).join(" ")}
                            </td>
                            <td>{String(row.bonus).padStart(2, "0")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsTestModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


