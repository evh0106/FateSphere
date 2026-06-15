import type { MenuProps } from "../lt645/types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu2ConvertDocs({ runTask, setLastResponse, setMessage }: MenuProps) {
  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Convert docs/result.md to db/result.csv (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 2 (pt720 skeleton).</p>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            setLastResponse({ converted: 0 });
            setMessage(`[Skeleton] Converted 0 rows for pt720.`);
          })
        }
      >
        Run Convert
      </button>
    </section>
  );
}
