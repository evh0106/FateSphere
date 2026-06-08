import { crawlNewResults } from "../api/client";
import type { MenuProps } from "./types";

export default function Menu3CrawlNew({ runTask, setLastResponse, setMessage }: MenuProps) {
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
