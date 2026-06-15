import { useMemo } from "react";
import type { ProbabilityRow } from "../../types";

export default function Menu1PrizeProbabilities() {
  const probabilityRows: ProbabilityRow[] = useMemo(() => [
    { rank: "1st (All Correct)", favorable: 1, total: 5000000, probability: 1/5000000, odds: 5000000 },
    { rank: "2nd (Same group/number)", favorable: 4, total: 5000000, probability: 4/5000000, odds: 1250000 },
  ], []);

  return (
    <section className="panel">
      <h2>Prize Probabilities (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 1: Show prize probabilities (pt720 skeleton).</p>
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
