import { useEffect, useState, type CSSProperties } from "react";
import {
  addExcludeRulePt720,
  generateExcludedRulesPt720,
  getExcludeRulesPt720,
  saveExcludeRulesPt720,
} from "../../api/client";
import type { ExcludeRule } from "../../types";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu6ManageExcludedPt720({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [excludeRules, setExcludeRules] = useState<ExcludeRule[]>([]);
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [functionName, setFunctionName] = useState("");

  async function loadExcludeRules() {
    const data = await getExcludeRulesPt720();
    setExcludeRules(data.rows);
    setCheckedRows({});
    setLastResponse(data);
  }

  useEffect(() => {
    runTask(async () => {
      await loadExcludeRules();
      setMessage("Loaded pt720 exclude rules.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveRule = () => {
    if (!ruleName.trim() || !functionName.trim()) {
      alert("규칙명과 호출 함수 명을 모두 입력해주세요.");
      return;
    }

    runTask(async () => {
      const result = await addExcludeRulePt720(ruleName, functionName);
      setMessage(`Exclude rule saved successfully: ${result.rule_name}`);
      setIsModalOpen(false);
      setRuleName("");
      setFunctionName("");
      setLastResponse(result);
      await loadExcludeRules();
    });
  };

  const handleCheckRow = (index: number) => {
    setCheckedRows((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleFieldChange = (index: number, field: keyof ExcludeRule, value: string) => {
    const updatedRules = [...excludeRules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setExcludeRules(updatedRules);
  };

  const handleStatusChange = (index: number, newStatus: string) => {
    handleFieldChange(index, "is_active", newStatus);
  };

  const editableInputStyle = (isChecked: boolean): CSSProperties => ({
    width: "100%",
    padding: "0.2rem 0.4rem",
    borderRadius: "4px",
    border: "1px solid var(--border-default)",
    background: isChecked ? "var(--bg-default)" : "var(--bg-subtle)",
    color: isChecked ? "var(--fg-default)" : "var(--fg-muted)",
    cursor: isChecked ? "text" : "not-allowed",
    fontFamily: "inherit",
    fontSize: "inherit"
  });

  const handleSaveAllRules = () => {
    runTask(async () => {
      const result = await saveExcludeRulesPt720(excludeRules);
      setMessage(`${result.message}. (Saved ${result.count} rules)`);
      await loadExcludeRules();
    });
  };

  const handleGenerateExcluded = () => {
    runTask(async () => {
      const result = await generateExcludedRulesPt720(excludeRules);
      setMessage(`${result.message}. (Saved ${result.count} rules)`);
      await loadExcludeRules();
    });
  };

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Manage Excluded Number Combinations (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 6 (pt720 exclude rules).</p>

      <div className="row-actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            runTask(async () => {
              await loadExcludeRules();
              setMessage("Loaded pt720 exclude rules.");
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
          onClick={handleGenerateExcluded}
          style={{
            background: "var(--success-emphasis)",
            color: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)"
          }}
        >
          Generate
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
            </tr>
          </thead>
          <tbody>
            {excludeRules.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1.5rem" }}>
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
                  <td>
                    <input
                      type="text"
                      value={item.rule_name}
                      onChange={(e) => handleFieldChange(index, "rule_name", e.target.value)}
                      disabled={!checkedRows[index]}
                      style={{ ...editableInputStyle(!!checkedRows[index]), fontWeight: 500 }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.function_name}
                      onChange={(e) => handleFieldChange(index, "function_name", e.target.value)}
                      disabled={!checkedRows[index]}
                      style={{ ...editableInputStyle(!!checkedRows[index]), fontFamily: "monospace" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.start_round}
                      placeholder="All"
                      onChange={(e) => handleFieldChange(index, "start_round", e.target.value)}
                      disabled={!checkedRows[index]}
                      style={editableInputStyle(!!checkedRows[index])}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.end_round}
                      placeholder="All"
                      onChange={(e) => handleFieldChange(index, "end_round", e.target.value)}
                      disabled={!checkedRows[index]}
                      style={editableInputStyle(!!checkedRows[index])}
                    />
                  </td>
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