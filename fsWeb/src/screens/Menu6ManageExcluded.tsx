import { useEffect, useState } from "react";
import { deleteExcludedCombination, getExcludedCombinations } from "../api/client";
import { formatNumbers } from "../utils";
import type { ExcludedCombination } from "../types";
import type { MenuProps } from "./types";

export default function Menu6ManageExcluded({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [excludedRows, setExcludedRows] = useState<ExcludedCombination[]>([]);
  const [visibleNumbers, setVisibleNumbers] = useState<Record<string, boolean>>({});

  async function loadExcluded() {
    const data = await getExcludedCombinations();
    setExcludedRows(data.rows);
    setLastResponse(data);
  }

  useEffect(() => {
    runTask(async () => {
      await loadExcluded();
      setMessage("Loaded excluded combinations.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleNumbers = (id: string) => {
    setVisibleNumbers((prev) => ({ ...prev, [id]: !prev[id] }));
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
              await loadExcluded();
              setMessage("Excluded combinations refreshed.");
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
              <th>적용시작회차</th>
              <th>적용종료회차</th>
              <th>적용숫자조회</th>
              <th>수정일자</th>
              <th>사용여부</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {excludedRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1.5rem" }}>
                  등록된 제외 규칙이 없습니다.
                </td>
              </tr>
            ) : (
              excludedRows.map((item, index) => (
                <tr key={item.id}>
                  <td>제외 규칙 #{index + 1}</td>
                  <td>1회차</td>
                  <td>무제한</td>
                  <td>
                    {visibleNumbers[item.id] ? (
                      <span style={{ fontWeight: "600", color: "var(--accent-emphasis)" }}>
                        {formatNumbers(item.numbers)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => toggleNumbers(item.id)}
                      >
                        조회
                      </button>
                    )}
                    {visibleNumbers[item.id] && (
                      <button
                        type="button"
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          marginLeft: "0.5rem",
                          background: "none",
                          border: "none",
                          color: "var(--fg-muted)",
                          textDecoration: "underline",
                          cursor: "pointer"
                        }}
                        onClick={() => toggleNumbers(item.id)}
                      >
                        숨기기
                      </button>
                    )}
                  </td>
                  <td>2026-06-10</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: "var(--accent-muted)",
                        color: "var(--accent-emphasis)"
                      }}
                    >
                      사용중
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="danger"
                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() =>
                        runTask(async () => {
                          await deleteExcludedCombination(item.id);
                          await loadExcluded();
                          setMessage("Excluded combination removed.");
                        })
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

