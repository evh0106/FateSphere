import { useEffect, useState } from "react";
import { addExcludeRule, getExcludeRules } from "../api/client";
import type { ExcludeRule } from "../types";
import type { MenuProps } from "./types";

export default function Menu6ManageExcluded({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [excludeRules, setExcludeRules] = useState<ExcludeRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [functionName, setFunctionName] = useState("");

  async function loadExcludeRules() {
    const data = await getExcludeRules();
    setExcludeRules(data.rows);
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
      setMessage(`제외 규칙이 성공적으로 추가되었습니다: ${result.rule_name}`);
      setIsModalOpen(false);
      setRuleName("");
      setFunctionName("");
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
          onClick={() => setIsModalOpen(true)}
          style={{
            background: "var(--accent-emphasis)",
            color: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)"
          }}
        >
          규칙 추가
        </button>
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
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>규칙명</th>
              <th>호출 함수 명</th>
              <th>적용시작회차</th>
              <th>적용종료회차</th>
              <th>수정일자</th>
              <th>사용여부</th>
            </tr>
          </thead>
          <tbody>
            {excludeRules.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1.5rem" }}>
                  등록된 제외 규칙이 없습니다.
                </td>
              </tr>
            ) : (
              excludeRules.map((item, index) => (
                <tr key={`${item.rule_name}-${index}`}>
                  <td style={{ fontWeight: 500 }}>{item.rule_name}</td>
                  <td><code>{item.function_name}</code></td>
                  <td>{item.start_round ? `${item.start_round}회차` : "1회차"}</td>
                  <td>{item.end_round ? `${item.end_round}회차` : "무제한"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--fg-muted)" }}>{item.updated_at || "-"}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: item.is_active === "Y" ? "var(--accent-muted)" : "var(--bg-subtle)",
                        color: item.is_active === "Y" ? "var(--accent-emphasis)" : "var(--fg-muted)"
                      }}
                    >
                      {item.is_active === "Y" ? "사용중" : "중지"}
                    </span>
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
    </section>
  );
}

