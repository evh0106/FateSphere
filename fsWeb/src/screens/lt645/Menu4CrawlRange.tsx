import { useState } from "react";
import { crawlRange } from "../../api/client";
import type { MenuProps } from "./types";

export default function Menu4CrawlRange({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [crawlStartRound, setCrawlStartRound] = useState("1");
  const [crawlEndRound, setCrawlEndRound] = useState("10");

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
