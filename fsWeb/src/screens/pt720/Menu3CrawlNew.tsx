import type { MenuProps } from "../lt645/types";

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
            setLastResponse({ crawled: 0 });
            setMessage(`[Skeleton] Crawled 0 new rows for pt720.`);
          })
        }
      >
        Crawl New Results
      </button>
    </section>
  );
}
