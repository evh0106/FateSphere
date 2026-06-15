import { useState } from "react";
import type { MenuKey } from "./types";
import Menu1PrizeProbabilitiesLt from "./screens/lt645/Menu1PrizeProbabilities";
import Menu2ConvertDocsLt from "./screens/lt645/Menu2ConvertDocs";
import Menu3CrawlNewLt from "./screens/lt645/Menu3CrawlNew";
import Menu4CrawlRangeLt from "./screens/lt645/Menu4CrawlRange";
import Menu5ShowResultsLt from "./screens/lt645/Menu5ShowResults";
import Menu6ManageExcludedLt from "./screens/lt645/Menu6ManageExcluded";
import Menu9GenerateCombinationsLt from "./screens/lt645/Menu9GenerateCombinations";
import Menu0ExitLt from "./screens/lt645/Menu0Exit";

import Menu1PrizeProbabilitiesPt from "./screens/pt720/Menu1PrizeProbabilities";
import Menu2ConvertDocsPt from "./screens/pt720/Menu2ConvertDocs";
import Menu3CrawlNewPt from "./screens/pt720/Menu3CrawlNew";
import Menu4CrawlRangePt from "./screens/pt720/Menu4CrawlRange";
import Menu5ShowResultsPt from "./screens/pt720/Menu5ShowResults";
import Menu6ManageExcludedPt from "./screens/pt720/Menu6ManageExcluded";
import Menu9GenerateCombinationsPt from "./screens/pt720/Menu9GenerateCombinations";
import Menu0ExitPt from "./screens/pt720/Menu0Exit";

type ActiveGame = "lt645" | "pt720";

const MENU_ITEMS_LT645: Array<{ key: MenuKey; label: string }> = [
  { key: "1", label: "1. Show prize probabilities" },
  { key: "2", label: "2. Convert docs/result.md to db/result.csv" },
  { key: "3", label: "3. Crawl new lottery results into db/result.csv" },
  { key: "4", label: "4. Crawl lottery results (range input) into db/result.csv" },
  { key: "5", label: "5. Print db/result.csv (latest 10 or round range)" },
  { key: "6", label: "6. Managing Excluded Number Combinations" },
  { key: "9", label: "9. Generate my number combinations" },
  { key: "0", label: "0. Exit" }
];

const MENU_ITEMS_PT720: Array<{ key: MenuKey; label: string }> = [
  { key: "1", label: "1. Show prize probabilities (pt720)" },
  { key: "2", label: "2. Convert docs/result.md (pt720)" },
  { key: "3", label: "3. Crawl new lottery results (pt720)" },
  { key: "4", label: "4. Crawl lottery results range (pt720)" },
  { key: "5", label: "5. Print results (pt720)" },
  { key: "6", label: "6. Managing Excluded (pt720)" },
  { key: "9", label: "9. Generate combinations (pt720)" },
  { key: "0", label: "0. Exit" }
];

export default function App() {
  const [activeGame, setActiveGame] = useState<ActiveGame>("lt645");
  const [activeMenu, setActiveMenu] = useState<MenuKey>("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready.");
  const [lastResponse, setLastResponse] = useState<unknown>(null);

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

  const menuProps = { runTask, setLastResponse, setMessage };

  function renderActiveContent() {
    if (activeGame === "pt720") {
      switch (activeMenu) {
        case "1":
          return <Menu1PrizeProbabilitiesPt />;
        case "2":
          return <Menu2ConvertDocsPt {...menuProps} />;
        case "3":
          return <Menu3CrawlNewPt {...menuProps} />;
        case "4":
          return <Menu4CrawlRangePt {...menuProps} />;
        case "5":
          return <Menu5ShowResultsPt {...menuProps} />;
        case "6":
          return <Menu6ManageExcludedPt {...menuProps} />;
        case "9":
          return <Menu9GenerateCombinationsPt {...menuProps} />;
        case "0":
        default:
          return <Menu0ExitPt />;
      }
    }

    switch (activeMenu) {
      case "1":
        return <Menu1PrizeProbabilitiesLt />;
      case "2":
        return <Menu2ConvertDocsLt {...menuProps} />;
      case "3":
        return <Menu3CrawlNewLt {...menuProps} />;
      case "4":
        return <Menu4CrawlRangeLt {...menuProps} />;
      case "5":
        return <Menu5ShowResultsLt {...menuProps} />;
      case "6":
        return <Menu6ManageExcludedLt {...menuProps} />;
      case "9":
        return <Menu9GenerateCombinationsLt {...menuProps} />;
      case "0":
      default:
        return <Menu0ExitLt />;
    }
  }

  const currentMenuItems = activeGame === "lt645" ? MENU_ITEMS_LT645 : MENU_ITEMS_PT720;

  return (
    <div className="app-shell">
      <header className="hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p className="eyebrow">FATE SPHERE</p>
          <h1>Fate Sphere Web Frontend</h1>
          <p className="hero-copy">A React UI that mirrors the original CLI menu flow and actions.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", background: "var(--bg-subtle)", padding: "0.25rem", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => {
              setActiveGame("lt645");
              setActiveMenu("1");
            }}
            style={{
              background: activeGame === "lt645" ? "var(--accent-emphasis)" : "transparent",
              color: activeGame === "lt645" ? "#ffffff" : "var(--fg-default)",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            lt645
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveGame("pt720");
              setActiveMenu("1");
            }}
            style={{
              background: activeGame === "pt720" ? "var(--accent-emphasis)" : "transparent",
              color: activeGame === "pt720" ? "#ffffff" : "var(--fg-default)",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            pt720
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="menu-panel">
          <h2>{activeGame} menu</h2>
          <ul>
            {currentMenuItems.map((item) => (
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
