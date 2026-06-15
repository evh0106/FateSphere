import { useState } from "react";
import type { MenuProps } from "../lt645/types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu4CrawlRange({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [crawlStartRound, setCrawlStartRound] = useState("1");
  const [crawlEndRound, setCrawlEndRound] = useState("10");

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Crawl Results by Round Range (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 4 (pt720 skeleton).</p>
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
            setLastResponse({ crawled: 0 });
            setMessage(`[Skeleton] Crawled 0 rows from round ${start} to ${end} for pt720.`);
          })
        }
      >
        Crawl by Range
      </button>
    </section>
  );
}
