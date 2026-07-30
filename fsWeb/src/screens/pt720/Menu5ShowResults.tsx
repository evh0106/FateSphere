import { useState } from "react";
import { getResultsPt720 } from "../../api/client";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

function getNumberColor(index: number): string {
  if (index === 0) return "#DE4C0E";
  if (index === 1) return "#F08200";
  if (index === 2) return "#F3C00F";
  if (index === 3) return "#2A9BDB";
  if (index === 4) return "#A87AD7";
  if (index === 5) return "#ADB0BA";
  return "inherit";
}

function renderDigitSpans(value: string) {
  return value.split("").map((digit, idx) => (
    <span
      key={idx}
      style={{
        color: getNumberColor(idx),
        fontWeight: "bold",
        marginRight: idx < 5 ? "8px" : "0"
      }}
    >
      {digit}
    </span>
  ));
}

export default function Menu5ShowResults({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [showStartRound, setShowStartRound] = useState("");
  const [showEndRound, setShowEndRound] = useState("");
  const [results, setResults] = useState<Array<{ round: number; group: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: string }>>([]);

  function renderResultsTable() {
    if (results.length === 0) {
      return <p className="muted">No rows loaded.</p>;
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Group</th>
            <th>Numbers</th>
            <th>Bonus</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.round}>
              <td>{row.round}</td>
              <td>
                <span style={{ fontWeight: "bold", color: "#525252" }}>{row.group}</span>
              </td>
              <td>
                {[row.n1, row.n2, row.n3, row.n4, row.n5, row.n6].map((num, idx) => (
                  <span
                    key={idx}
                    style={{
                      color: getNumberColor(idx),
                      fontWeight: "bold",
                      marginRight: idx < 5 ? "8px" : "0"
                    }}
                  >
                    {String(num)}
                  </span>
                ))}
              </td>
              <td>
                {renderDigitSpans(row.bonus)}
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
      <h2>Show db/result.csv (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 5 (latest 10 or round range, pt720).</p>
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
              const data = await getResultsPt720({ limit: 10 });
              setResults(data.rows);
              setLastResponse(data);
              setMessage(`Loaded ${data.rows.length} latest rows for pt720.`);
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

            const data = await getResultsPt720({ startRound: start, endRound: end });
            setResults(data.rows);
            setLastResponse(data);
            setMessage(`Loaded ${data.rows.length} rows from round ${start} to ${end} for pt720.`);
          })
        }
      >
        Load Results
      </button>
      {renderResultsTable()}
    </section>
  );
}
