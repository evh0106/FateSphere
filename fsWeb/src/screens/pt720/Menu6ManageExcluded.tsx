import { useEffect, useState } from "react";
import type { ExcludeRule } from "../../types";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

// pt720 전용 스켈레톤 API 모방 클라이언트 로직
const DUMMY_RULES: ExcludeRule[] = [
  {
    rule_name: "임시 제외 규칙 1",
    function_name: "pt720_exclude_rule_1",
    start_round: "1",
    end_round: "",
    updated_at: "2026-06-15 12:00:00",
    is_active: "Y"
  },
  {
    rule_name: "임시 제외 규칙 2",
    function_name: "pt720_exclude_rule_2",
    start_round: "5",
    end_round: "10",
    updated_at: "2026-06-15 12:05:00",
    is_active: "N"
  }
];

export default function Menu6ManageExcludedPt720({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [excludeRules, setExcludeRules] = useState<ExcludeRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [functionName, setFunctionName] = useState("");

  async function loadExcludeRules() {
    // 스켈레톤이므로 더미 데이터 로딩 시뮬레이션
    return new Promise<{ rows: ExcludeRule[] }>((resolve) => {
      setTimeout(() => {
        resolve({ rows: [...DUMMY_RULES] });
      }, 300);
    });
  }

  const reload = () => {
    runTask(async () => {
      const data = await loadExcludeRules();
      setExcludeRules(data.rows);
      setLastResponse(data);
      setMessage("Loaded pt720 exclude rules (Skeleton).");
    });
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveRule = () => {
    if (!ruleName.trim() || !functionName.trim()) {
      alert("규칙명과 호출 함수 명을 모두 입력해주세요.");
      return;
    }
    runTask(async () => {
      // 로컬 상태 추가만 시뮬레이션
      const newRule: ExcludeRule = {
        rule_name: ruleName,
        function_name: functionName,
        start_round: "1",
        end_round: "",
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        is_active: "Y"
      };
      DUMMY_RULES.push(newRule);
      setMessage(`[Skeleton] 제외 규칙이 추가되었습니다 (서버 저장되지 않음): ${ruleName}`);
      setIsModalOpen(false);
      setRuleName("");
      setFunctionName("");
      const data = await loadExcludeRules();
      setExcludeRules(data.rows);
      setLastResponse({ success: true, added: newRule });
    });
  };

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Manage Excluded Number Combinations (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 6 (pt720 skeleton).</p>
      
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
          onClick={reload}
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
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>제외 규칙 추가 (pt720)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span>규칙명</span>
                <input
                  type="text"
                  placeholder="예: 조/일련번호 특정 규칙 제외"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span>호출 함수 명</span>
                <input
                  type="text"
                  placeholder="예: exclude_pt720_dummy"
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
