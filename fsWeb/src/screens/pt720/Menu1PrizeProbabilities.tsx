import { useMemo } from "react";
import type { ProbabilityRow } from "../../types";

const sourceFilePath = __SOURCE_FILE_PATH__;

function buildProbabilityRows(): ProbabilityRow[] {
  const total = 5000000;

  const rows: Array<{ rank: string; favorable: number }> = [
    { rank: "1st Prize (7 digits)", favorable: 1 },
    { rank: "2nd Prize (6 digits)", favorable: 4 },
    { rank: "3rd Prize (5 digits)", favorable: 45 },
    { rank: "4th Prize (4 digits)", favorable: 450 },
    { rank: "5th Prize (3 digits)", favorable: 4500 },
    { rank: "6th Prize (2 digits)", favorable: 45000 },
    { rank: "7th Prize (1 digit)", favorable: 450000 },
    { rank: "Bonus (6 digits)", favorable: 5 }
  ];

  return rows.map((row) => ({
    rank: row.rank,
    favorable: row.favorable,
    total,
    probability: row.favorable / total,
    odds: total / row.favorable
  }));
}

export default function Menu1PrizeProbabilities() {
  const probabilityRows = useMemo(() => buildProbabilityRows(), []);

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Prize Probabilities (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 1: Show prize probabilities (pt720).</p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Favorable cases</th>
            <th>Total cases</th>
            <th>Probability</th>
            <th>Odds</th>
          </tr>
        </thead>
        <tbody>
          {probabilityRows.map((row) => (
            <tr key={row.rank}>
              <td>{row.rank}</td>
              <td>{row.favorable.toLocaleString()}</td>
              <td>{row.total.toLocaleString()}</td>
              <td>{(row.probability * 100).toFixed(8)}%</td>
              <td>1 / {row.odds.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
