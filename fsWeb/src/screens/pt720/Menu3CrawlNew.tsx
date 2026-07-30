import { crawlNewResultsPt720 } from "../../api/client";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu3CrawlNew({ runTask, setLastResponse, setMessage }: MenuProps) {
  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Crawl New Lottery Results (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 3 (pt720 skeleton).</p>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            const data = await crawlNewResultsPt720();
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
