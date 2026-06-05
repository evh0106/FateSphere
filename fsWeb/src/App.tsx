import { useEffect, useMemo, useState } from "react";
import {
  addExcludedCombination,
  convertDocsResult,
  crawlNewResults,
  crawlRange,
  deleteExcludedCombination,
  generateMyCombinations,
  getExcludedCombinations,
  getResults
} from "./api/client";
import type { MenuKey, ProbabilityRow, ResultRow } from "./types";

const MENU_ITEMS: Array<{ key: MenuKey; label: string }> = [
  { key: "1", label: "1. Show prize probabilities" },
  { key: "2", label: "2. Convert docs/result.md to db/result.csv" },
  { key: "3", label: "3. Crawl new lottery results into db/result.csv" },
  { key: "4", label: "4. Crawl lottery results (range input) into db/result.csv" },
  { key: "5", label: "5. Print db/result.csv (latest 10 or round range)" },
  { key: "6", label: "6. Managing Excluded Number Combinations" },
  { key: "9", label: "9. Generate my number combinations" },
  { key: "0", label: "0. Exit" }
];

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

function formatNumbers(numbers: number[]): string {
  return numbers.map((num) => String(num).padStart(2, "0")).join(" ");
}

function parseSixUniqueNumbers(raw: string): number[] {
  const parts = raw
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 6) {
    throw new Error("Exactly 6 numbers are required.");
  }

  const numbers = parts.map((part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 1 || value > 45) {
      throw new Error("Numbers must be integers from 1 to 45.");
    }
    return value;
  });

  const unique = new Set(numbers);
  if (unique.size !== 6) {
    throw new Error("All numbers must be unique.");
  }

  return [...numbers].sort((a, b) => a - b);
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready.");
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  const [crawlStartRound, setCrawlStartRound] = useState("1");
  const [crawlEndRound, setCrawlEndRound] = useState("10");

  const [showStartRound, setShowStartRound] = useState("");
  const [showEndRound, setShowEndRound] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);

  const [excludedInput, setExcludedInput] = useState("1 2 3 4 5 6");
  const [excludedRows, setExcludedRows] = useState<Array<{ id: string; numbers: number[] }>>([]);

  const [generateCount, setGenerateCount] = useState("5");
  const [generatedRows, setGeneratedRows] = useState<number[][]>([]);

  const probabilityRows = useMemo(() => buildProbabilityRows(), []);

  async function runTask(task: () => Promise<void>) {
    try {
      setLoading(true);
      setMessage("Running...");
      await task();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadExcluded() {
    const data = await getExcludedCombinations();
    setExcludedRows(data.rows);
    setLastResponse(data);
  }

  useEffect(() => {
    if (activeMenu === "6") {
      runTask(async () => {
        await loadExcluded();
        setMessage("Loaded excluded combinations.");
      });
    }
  }, [activeMenu]);

  function renderProbabilityTable() {
    return (
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
    );
  }

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
              <td>{formatNumbers([row.n1, row.n2, row.n3, row.n4, row.n5, row.n6])}</td>
              <td>{String(row.bonus).padStart(2, "0")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderExcludedList() {
    return (
      <div className="excluded-list">
        {excludedRows.length === 0 ? <p className="muted">No excluded combinations.</p> : null}
        {excludedRows.map((item) => (
          <div key={item.id} className="excluded-item">
            <span>{formatNumbers(item.numbers)}</span>
            <button
              type="button"
              className="danger"
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
          </div>
        ))}
      </div>
    );
  }

  function renderGeneratedList() {
    if (generatedRows.length === 0) {
      return <p className="muted">No combinations generated yet.</p>;
    }

    return (
      <ol className="generated-list">
        {generatedRows.map((combo, index) => (
          <li key={`${combo.join("-")}-${index}`}>{formatNumbers(combo)}</li>
        ))}
      </ol>
    );
  }

  function renderActiveContent() {
    if (activeMenu === "1") {
      return (
        <section className="panel">
          <h2>Prize Probabilities</h2>
          <p className="muted">Equivalent to CLI menu 1: Show prize probabilities.</p>
          {renderProbabilityTable()}
        </section>
      );
    }

    if (activeMenu === "2") {
      return (
        <section className="panel">
          <h2>Convert docs/result.md to db/result.csv</h2>
          <p className="muted">Equivalent to CLI menu 2.</p>
          <button
            type="button"
            onClick={() =>
              runTask(async () => {
                const data = await convertDocsResult();
                setLastResponse(data);
                setMessage(`Converted ${data.converted} rows.`);
              })
            }
          >
            Run Convert
          </button>
        </section>
      );
    }

    if (activeMenu === "3") {
      return (
        <section className="panel">
          <h2>Crawl New Lottery Results</h2>
          <p className="muted">Equivalent to CLI menu 3.</p>
          <button
            type="button"
            onClick={() =>
              runTask(async () => {
                const data = await crawlNewResults();
                setLastResponse(data);
                setMessage(`Crawled ${data.crawled} new rows.`);
              })
            }
          >
            Crawl New Results
          </button>
        </section>
      );
    }

    if (activeMenu === "4") {
      return (
        <section className="panel">
          <h2>Crawl Results by Round Range</h2>
          <p className="muted">Equivalent to CLI menu 4.</p>
          <div className="form-row">
            <label>
              Start round
              <input value={crawlStartRound} onChange={(event) => setCrawlStartRound(event.target.value)} />
            </label>
            <label>
              End round
              <input value={crawlEndRound} onChange={(event) => setCrawlEndRound(event.target.value)} />
            </label>
          </div>
          <button
            type="button"
            onClick={() =>
              runTask(async () => {
                const start = Number(crawlStartRound);
                const end = Number(crawlEndRound);
                if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
                  throw new Error("Round values must be positive integers.");
                }
                if (start > end) {
                  throw new Error("Start round must be less than or equal to end round.");
                }
                const data = await crawlRange(start, end);
                setLastResponse(data);
                setMessage(`Crawled ${data.crawled} rows from round ${start} to ${end}.`);
              })
            }
          >
            Crawl by Range
          </button>
        </section>
      );
    }

    if (activeMenu === "5") {
      return (
        <section className="panel">
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

    if (activeMenu === "6") {
      return (
        <section className="panel">
          <h2>Manage Excluded Number Combinations</h2>
          <p className="muted">Equivalent to CLI menu 6.</p>
          <div className="form-row">
            <label className="wide">
              Numbers (6 unique values from 1 to 45)
              <input
                value={excludedInput}
                onChange={(event) => setExcludedInput(event.target.value)}
                placeholder="e.g. 1 2 3 4 5 6"
              />
            </label>
          </div>
          <div className="row-actions">
            <button
              type="button"
              onClick={() =>
                runTask(async () => {
                  const numbers = parseSixUniqueNumbers(excludedInput);
                  const data = await addExcludedCombination(numbers);
                  setLastResponse(data);
                  await loadExcluded();
                  setMessage("Excluded combination added.");
                })
              }
            >
              Add Combination
            </button>
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
          {renderExcludedList()}
        </section>
      );
    }

    if (activeMenu === "9") {
      return (
        <section className="panel">
          <h2>Generate My Number Combinations</h2>
          <p className="muted">Equivalent to CLI menu 9.</p>
          <div className="form-row">
            <label>
              Count
              <input value={generateCount} onChange={(event) => setGenerateCount(event.target.value)} />
            </label>
          </div>
          <button
            type="button"
            onClick={() =>
              runTask(async () => {
                const count = Number(generateCount);
                if (!Number.isInteger(count) || count <= 0) {
                  throw new Error("Count must be a positive integer.");
                }
                const data = await generateMyCombinations(count);
                setGeneratedRows(data.combinations);
                setLastResponse(data);
                setMessage(`Generated ${data.combinations.length} combinations.`);
              })
            }
          >
            Generate
          </button>
          {renderGeneratedList()}
        </section>
      );
    }

    return (
      <section className="panel">
        <h2>Exit</h2>
        <p>This mirrors CLI menu 0. Close the browser tab to end the session.</p>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">FATE SPHERE</p>
        <h1>lt645 Web Frontend</h1>
        <p className="hero-copy">A React UI that mirrors the original CLI menu flow and actions.</p>
      </header>

      <div className="layout">
        <aside className="menu-panel">
          <h2>lt645 menu</h2>
          <ul>
            {MENU_ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={activeMenu === item.key ? "menu-item active" : "menu-item"}
                  onClick={() => setActiveMenu(item.key)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="content-panel">
          {renderActiveContent()}
          <section className="panel">
            <h3>Status</h3>
            <p className={loading ? "status running" : "status"}>{message}</p>
            <h3>Last response</h3>
            <pre>{JSON.stringify(lastResponse, null, 2) || "No response yet."}</pre>
          </section>
        </main>
      </div>
    </div>
  );
}
