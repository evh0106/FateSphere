import { useState } from "react";
import type { MenuKey } from "./types";
import Menu1PrizeProbabilities from "./screens/Menu1PrizeProbabilities";
import Menu2ConvertDocs from "./screens/Menu2ConvertDocs";
import Menu3CrawlNew from "./screens/Menu3CrawlNew";
import Menu4CrawlRange from "./screens/Menu4CrawlRange";
import Menu5ShowResults from "./screens/Menu5ShowResults";
import Menu6ManageExcluded from "./screens/Menu6ManageExcluded";
import Menu9GenerateCombinations from "./screens/Menu9GenerateCombinations";
import Menu0Exit from "./screens/Menu0Exit";

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

export default function App() {
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
    switch (activeMenu) {
      case "1":
        return <Menu1PrizeProbabilities />;
      case "2":
        return <Menu2ConvertDocs {...menuProps} />;
      case "3":
        return <Menu3CrawlNew {...menuProps} />;
      case "4":
        return <Menu4CrawlRange {...menuProps} />;
      case "5":
        return <Menu5ShowResults {...menuProps} />;
      case "6":
        return <Menu6ManageExcluded {...menuProps} />;
      case "9":
        return <Menu9GenerateCombinations {...menuProps} />;
      case "0":
      default:
        return <Menu0Exit />;
    }
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

