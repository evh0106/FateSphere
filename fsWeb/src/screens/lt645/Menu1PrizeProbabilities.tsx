import { useMemo } from "react";
import type { ProbabilityRow } from "../../types";

function nCr(n: number, r: number): number {
  if (r < 0 || r > n) {
    return 0;
  }
  const pick = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= pick; i += 1) {
    result = (result * (n - pick + i)) / i;
  }
  return result;
}

function buildProbabilityRows(): ProbabilityRow[] {
  const total = nCr(45, 6);
  const first = nCr(6, 6) * nCr(39, 0);
  const second = nCr(6, 5) * nCr(1, 1) * nCr(38, 0);
  const third = nCr(6, 5) * nCr(38, 1);
  const fourth = nCr(6, 4) * nCr(39, 2);
  const fifth = nCr(6, 3) * nCr(39, 3);

  const rows: Array<{ rank: string; favorable: number }> = [
    { rank: "1st (6 matches)", favorable: first },
    { rank: "2nd (5 + bonus)", favorable: second },
    { rank: "3rd (5 matches)", favorable: third },
    { rank: "4th (4 matches)", favorable: fourth },
    { rank: "5th (3 matches)", favorable: fifth }
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
      <h2>Prize Probabilities</h2>
      <p className="muted">Equivalent to CLI menu 1: Show prize probabilities.</p>
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
