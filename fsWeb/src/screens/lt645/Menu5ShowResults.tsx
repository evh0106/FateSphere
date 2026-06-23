import { useState } from "react";
import { getResults } from "../../api/client";
import { formatNumbers } from "../../utils";
import type { ResultRow } from "../../types";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

function getNumberColor(num: number): string {
  if (num >= 1 && num <= 10) return "#e08f00";
  if (num >= 11 && num <= 20) return "#0063cc";
  if (num >= 21 && num <= 30) return "#d8314f";
  if (num >= 31 && num <= 40) return "#6e7382";
  if (num >= 41 && num <= 45) return "#2c9e44";
  return "inherit";
}

export default function Menu5ShowResults({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [showStartRound, setShowStartRound] = useState("");
  const [showEndRound, setShowEndRound] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);

  function renderResultsTable() {
    if (results.length === 0) {
      return <p className="muted">No rows loaded.</p>;
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Date</th>
            <th>Numbers</th>
            <th>Bonus</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.round}>
              <td>{row.round}</td>
              <td>{row.draw_date ?? "-"}</td>
              <td>
                {[row.n1, row.n2, row.n3, row.n4, row.n5, row.n6].map((num, idx) => (
                  <span
                    key={idx}
                    style={{
                      color: getNumberColor(num),
                      fontWeight: "bold",
                      marginRight: idx < 5 ? "8px" : "0",
                    }}
                  >
                    {String(num).padStart(2, "0")}
                  </span>
                ))}
              </td>
              <td>
                <span style={{ color: getNumberColor(row.bonus), fontWeight: "bold" }}>
                  {String(row.bonus).padStart(2, "0")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Show db/result.csv</h2>
      <p className="muted">Equivalent to CLI menu 5 (latest 10 or round range).</p>
      <div className="form-row">
        <label>
          Start round (optional)
          <input value={showStartRound} onChange={(event) => setShowStartRound(event.target.value)} />
        </label>
        <label>
          End round (optional)
          <input value={showEndRound} onChange={(event) => setShowEndRound(event.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            const hasStart = showStartRound.trim() !== "";
            const hasEnd = showEndRound.trim() !== "";

            if (!hasStart && !hasEnd) {
              const data = await getResults({ limit: 10 });
              setResults(data.rows);
              setLastResponse(data);
              setMessage(`Loaded ${data.rows.length} latest rows.`);
              return;
            }

            if (!hasStart || !hasEnd) {
              throw new Error("To set a range, both start and end rounds are required.");
            }

            const start = Number(showStartRound);
            const end = Number(showEndRound);
            if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
              throw new Error("Round values must be positive integers.");
            }
            if (start > end) {
              throw new Error("Start round must be less than or equal to end round.");
            }

            const data = await getResults({ startRound: start, endRound: end });
            setResults(data.rows);
            setLastResponse(data);
            setMessage(`Loaded ${data.rows.length} rows from round ${start} to ${end}.`);
          })
        }
      >
        Load Results
      </button>
      {renderResultsTable()}
    </section>
  );
}
